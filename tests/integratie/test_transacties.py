"""De transacties uit functions/wijnclub/domein, uitgevoerd tegen DynamoDB (moto).

Gelijktijdigheid wordt hier nagespeeld zoals hij in DynamoDB werkt: twee leden lezen dezelfde stand
en schrijven daarna allebei. De voorwaarde in de transactie moet de tweede tegenhouden.
"""
from datetime import datetime, timedelta, timezone

import pytest
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from wijnclub import opslag
from wijnclub.domein import bestelling as b
from wijnclub.domein import bieding as bd
from wijnclub.domein import tijd

NU = datetime(2026, 11, 22, 19, 0, tzinfo=timezone.utc)
VERDEJO = {"wijnId": "wijn-a", "soort": "vast", "lijstId": "lijst-1", "naam": "Verdejo 2024", "prijs": 975, "voorraad": 6, "volgorde": 1}
CHIANTI = {"wijnId": "wijn-b", "soort": "vast", "lijstId": "lijst-1", "naam": "Chianti 2021", "prijs": 1600, "voorraad": 2, "volgorde": 2}
BAROLO = {
    "wijnId": "barolo", "soort": "bieding", "naam": "Barolo 2010", "biedingStatus": "open", "startbod": 25000,
    "minimaleVerhoging": 1000, "minimaalVolgendBod": 25000, "eindtijd": "2026-11-22T20:00:00Z",
}


@pytest.fixture
def avond(zet):
    zet("lijsten", {"lijstId": "lijst-1", "status": "open", "openTot": "2026-11-22T21:00:00Z"})
    zet("wijnen", VERDEJO)
    zet("wijnen", CHIANTI)
    zet("wijnen", BAROLO)


def voer_uit(db, stappen):
    """Voert een transactie uit; geeft None bij succes en anders de CancellationReasons."""
    try:
        db.transact_write_items(TransactItems=stappen)
    except ClientError as fout:
        if fout.response["Error"]["Code"] != "TransactionCanceledException":
            raise
        return fout.response["CancellationReasons"]
    return None


def nieuwe(regels, sleutel="poging-0001", lid="lid-1", aangemaakt=NU):
    return b.nieuwe_bestelling(
        bestelling_id=b.bestelling_id_uit_sleutel(lid, sleutel), lid_id=lid, soort=b.LIJST, lijst_id="lijst-1",
        regels=regels, wijnen={"wijn-a": VERDEJO, "wijn-b": CHIANTI}, levering=b.HALEN, ingevoerd_door="lid",
        aangemaakt=aangemaakt, aangeboden=b.LEVERINGEN,
    )


def reserveer(db, tabellen, bestelling, nu=NU):
    return voer_uit(db, b.reserveer_transactie(tabellen=tabellen, bestelling=bestelling, nu=nu))


def voorraad(lees, wijn_id):
    return int(lees("wijnen", wijnId=wijn_id)["voorraad"])


def test_de_tabellen_hebben_de_sleutels_uit_de_stack(db, tabellen):
    sleutels = {
        naam: [s["AttributeName"] for s in db.describe_table(TableName=tabelnaam)["Table"]["KeySchema"]]
        for naam, tabelnaam in tabellen.items()
    }
    assert sleutels == {
        "leden": ["lidId"], "lijsten": ["lijstId"], "wijnen": ["wijnId"], "biedingen": ["wijnId", "tijdstipLid"],
        "bestellingen": ["bestellingId"], "betalingen": ["mollieBetalingId"], "tellers": ["tellerId"],
    }


class TestBestellen:
    def test_een_bestelling_haalt_flessen_van_de_voorraad_en_staat_erin(self, db, tabellen, lees, avond):
        bestelling = nieuwe([{"wijnId": "wijn-a", "aantal": 2}, {"wijnId": "wijn-b", "aantal": 1}])
        assert reserveer(db, tabellen, bestelling) is None
        assert voorraad(lees, "wijn-a") == 4
        assert voorraad(lees, "wijn-b") == 1
        opgeslagen = lees("bestellingen", bestellingId=bestelling["bestellingId"])
        assert opgeslagen["status"] == "open"
        assert opgeslagen["totaal"] == 3550
        assert opgeslagen["betaalVoor"] == "2026-11-22T19:15:00Z"

    def test_alles_of_niets_als_een_wijn_op_is(self, db, tabellen, lees, avond):
        regels = [{"wijnId": "wijn-a", "aantal": 2}, {"wijnId": "wijn-b", "aantal": 3}]
        bestelling = nieuwe(regels)
        redenen = reserveer(db, tabellen, bestelling)
        assert redenen is not None
        assert b.uitverkocht(redenen, regels) == {"lijstGesloten": False, "wijnen": ["wijn-b"]}
        assert voorraad(lees, "wijn-a") == 6
        assert lees("bestellingen", bestellingId=bestelling["bestellingId"]) is None

    def test_de_voorraad_zakt_nooit_onder_nul(self, db, tabellen, lees, avond):
        # Vier leden lazen allemaal "6 over" en bestellen elk 2 flessen.
        uitkomsten = [
            reserveer(db, tabellen, nieuwe([{"wijnId": "wijn-a", "aantal": 2}], sleutel="poging-000{}".format(i), lid="lid-{}".format(i)))
            for i in range(1, 5)
        ]
        assert [u is None for u in uitkomsten] == [True, True, True, False]
        assert b.uitverkocht(uitkomsten[3], [{"wijnId": "wijn-a"}])["wijnen"] == ["wijn-a"]
        assert voorraad(lees, "wijn-a") == 0

    def test_dezelfde_poging_twee_keer_geeft_een_bestelling(self, db, tabellen, lees, avond):
        regels = [{"wijnId": "wijn-a", "aantal": 1}]
        bestelling = nieuwe(regels)
        assert reserveer(db, tabellen, bestelling) is None
        redenen = reserveer(db, tabellen, bestelling)
        assert redenen is not None and b.bestaat_al(redenen, regels)
        assert voorraad(lees, "wijn-a") == 5

    def test_een_gesloten_lijst_neemt_niets_aan(self, db, tabellen, lees, avond):
        regels = [{"wijnId": "wijn-a", "aantal": 1}]
        redenen = reserveer(db, tabellen, nieuwe(regels), nu=datetime(2026, 11, 22, 21, 0, tzinfo=timezone.utc))
        assert b.uitverkocht(redenen, regels)["lijstGesloten"] is True
        assert voorraad(lees, "wijn-a") == 6

    def test_een_bieding_is_niet_van_de_lijst_te_bestellen(self, db, tabellen, avond):
        bestelling = nieuwe([{"wijnId": "wijn-a", "aantal": 1}])
        bestelling["regels"] = [{"wijnId": "barolo", "naam": "Barolo 2010", "aantal": 1, "prijs": 1}]
        assert reserveer(db, tabellen, bestelling) is not None


class TestBetalenEnVerlopen:
    @pytest.fixture
    def bon(self, db, tabellen, avond):
        bestelling = nieuwe([{"wijnId": "wijn-a", "aantal": 2}])
        assert reserveer(db, tabellen, bestelling) is None
        return bestelling

    def betaal(self, db, tabellen, bon, betaling="tr_1", nu=NU + timedelta(minutes=5)):
        try:
            db.update_item(**b.betaald_wijziging(tabellen=tabellen, bestelling_id=bon["bestellingId"], betaling_id=betaling, nu=nu))
        except db.exceptions.ConditionalCheckFailedException:
            return False
        return True

    def verloop(self, db, tabellen, bon, nu=NU + timedelta(minutes=15)):
        return voer_uit(db, b.verloop_transactie(tabellen=tabellen, bestelling=bon, nu=nu))

    def test_een_melding_van_mollie_zet_de_bon_op_betaald(self, db, tabellen, lees, bon):
        assert self.betaal(db, tabellen, bon) is True
        opgeslagen = lees("bestellingen", bestellingId=bon["bestellingId"])
        assert (opgeslagen["status"], opgeslagen["mollieBetalingId"]) == ("betaald", "tr_1")

    def test_dezelfde_melding_twee_keer_verandert_niets(self, db, tabellen, lees, bon):
        assert self.betaal(db, tabellen, bon) is True
        assert self.betaal(db, tabellen, bon, nu=NU + timedelta(minutes=6)) is False
        opgeslagen = lees("bestellingen", bestellingId=bon["bestellingId"])
        assert opgeslagen["betaaldOp"] == tijd.iso(NU + timedelta(minutes=5))
        besluit = b.besluit_na_melding(opgeslagen["status"], "paid", betaling_id="tr_1", betaald_met=opgeslagen["mollieBetalingId"])
        assert besluit == b.Besluit()

    def test_een_onbetaalde_bon_verloopt_en_geeft_de_flessen_terug(self, db, tabellen, lees, bon):
        assert self.verloop(db, tabellen, bon) is None
        assert lees("bestellingen", bestellingId=bon["bestellingId"])["status"] == "verlopen"
        assert voorraad(lees, "wijn-a") == 6

    def test_verlopen_gebeurt_maar_een_keer(self, db, tabellen, lees, bon):
        assert self.verloop(db, tabellen, bon) is None
        assert self.verloop(db, tabellen, bon) is not None
        assert voorraad(lees, "wijn-a") == 6

    def test_een_betaalde_bon_verloopt_niet(self, db, tabellen, lees, bon):
        assert self.betaal(db, tabellen, bon) is True
        assert self.verloop(db, tabellen, bon) is not None
        assert lees("bestellingen", bestellingId=bon["bestellingId"])["status"] == "betaald"
        assert voorraad(lees, "wijn-a") == 4

    def test_een_verlopen_bon_gaat_niet_meer_op_betaald(self, db, tabellen, lees, bon):
        assert self.verloop(db, tabellen, bon) is None
        assert self.betaal(db, tabellen, bon, nu=NU + timedelta(minutes=16)) is False
        opgeslagen = lees("bestellingen", bestellingId=bon["bestellingId"])
        assert b.besluit_na_melding(opgeslagen["status"], "paid", betaling_id="tr_1", betaald_met=None).controle_nodig


class TestBieden:
    def wijn(self, lees):
        return lees("wijnen", wijnId="barolo")

    def bied(self, db, tabellen, gelezen, lid, bedrag, nu=NU + timedelta(minutes=10)):
        return voer_uit(db, bd.bod_transactie(tabellen=tabellen, wijn=gelezen, lid_id=lid, bedrag=bedrag, nu=nu))

    def test_een_bod_werkt_de_wijn_bij_en_wordt_bewaard(self, db, tabellen, lees, avond):
        assert self.bied(db, tabellen, self.wijn(lees), "lid-1", 25000) is None
        na = self.wijn(lees)
        assert (na["hoogsteBod"], na["hoogsteBieder"], na["minimaalVolgendBod"], na["aantalBiedingen"]) == (25000, "lid-1", 26000, 1)
        biedingen = db.query(
            TableName=tabellen["biedingen"], KeyConditionExpression="wijnId = :w", ExpressionAttributeValues={":w": {"S": "barolo"}}
        )["Items"]
        assert [i["bedrag"]["N"] for i in biedingen] == ["25000"]

    def test_van_twee_biedingen_op_dezelfde_stand_gaat_er_een_door(self, db, tabellen, lees, avond):
        gelezen = self.wijn(lees)
        assert self.bied(db, tabellen, gelezen, "lid-2", 26000) is None
        assert self.bied(db, tabellen, gelezen, "lid-3", 26000) is not None
        # Lid 3 leest opnieuw: zijn bod is nu te laag.
        with pytest.raises(bd.BodGeweigerd) as fout:
            self.bied(db, tabellen, self.wijn(lees), "lid-3", 26000)
        assert (fout.value.code, fout.value.minimaal) == ("bod_te_laag", 27000)
        assert self.wijn(lees)["hoogsteBieder"] == "lid-2"

    def test_een_bod_in_de_laatste_twee_minuten_verlengt_de_eindtijd(self, db, tabellen, lees, avond):
        assert self.bied(db, tabellen, self.wijn(lees), "lid-1", 25000, nu=NU + timedelta(minutes=59)) is None
        assert self.wijn(lees)["eindtijd"] == "2026-11-22T20:01:00Z"

    def sluit(self, db, tabellen, gelezen, nu=NU + timedelta(hours=1)):
        winnaar = gelezen.get("hoogsteBieder")
        bestelling = None
        if winnaar:
            bestelling = b.nieuwe_bestelling(
                bestelling_id="b-barolo", lid_id=winnaar, soort=b.BIEDING, lijst_id=None, regels=[{"wijnId": "barolo", "aantal": 1}],
                wijnen={"barolo": {"naam": gelezen["naam"], "prijs": int(gelezen["hoogsteBod"])}}, levering=None,
                ingevoerd_door="lid", aangemaakt=nu,
            )
        return voer_uit(db, bd.sluit_transactie(tabellen=tabellen, wijn=gelezen, bestelling=bestelling, nu=nu))

    def test_de_hamer_sluit_de_bieding_en_maakt_de_bon_van_de_winnaar(self, db, tabellen, lees, avond):
        assert self.bied(db, tabellen, self.wijn(lees), "lid-1", 25000) is None
        assert self.sluit(db, tabellen, self.wijn(lees)) is None
        assert self.wijn(lees)["biedingStatus"] == "gesloten"
        bon = lees("bestellingen", bestellingId="b-barolo")
        assert (bon["lidId"], bon["totaal"], bon["soort"], bon["betaalVoor"]) == ("lid-1", 25000, "bieding", "2026-11-24T20:00:00Z")

    def test_een_bod_vlak_voor_de_hamer_houdt_het_sluiten_tegen(self, db, tabellen, lees, avond):
        assert self.bied(db, tabellen, self.wijn(lees), "lid-1", 25000) is None
        gelezen_door_taak = self.wijn(lees)
        assert self.bied(db, tabellen, self.wijn(lees), "lid-2", 26000, nu=NU + timedelta(minutes=59, seconds=59)) is None
        assert self.sluit(db, tabellen, gelezen_door_taak) is not None
        assert self.wijn(lees)["biedingStatus"] == "open"
        assert lees("bestellingen", bestellingId="b-barolo") is None

    def test_de_taak_twee_keer_maakt_een_bon(self, db, tabellen, lees, avond):
        assert self.bied(db, tabellen, self.wijn(lees), "lid-1", 25000) is None
        gelezen = self.wijn(lees)
        assert self.sluit(db, tabellen, gelezen) is None
        assert self.sluit(db, tabellen, gelezen) is not None


class TestLezen:
    def test_open_lijsten_alleen_open_en_niet_voorbij(self, zet, tabellen):
        zet("lijsten", {"lijstId": "open", "status": "open", "openTot": "2026-11-22T21:00:00Z"})
        zet("lijsten", {"lijstId": "voorbij", "status": "open", "openTot": "2026-11-22T18:00:00Z"})
        zet("lijsten", {"lijstId": "dicht", "status": "gesloten", "openTot": "2026-11-22T21:00:00Z"})
        assert [lijst["lijstId"] for lijst in opslag.open_lijsten(tijd.iso(NU))] == ["open"]

    def test_wijnen_van_een_lijst_in_marcs_volgorde(self, zet, tabellen):
        for i, wijn_id in enumerate(["c", "a", "b"]):
            zet("wijnen", {"wijnId": wijn_id, "lijstId": "lijst-1", "volgorde": [3, 1, 2][i]})
        zet("wijnen", {"wijnId": "x", "lijstId": "lijst-2", "volgorde": 1})
        assert [w["wijnId"] for w in opslag.wijnen_van_lijst("lijst-1")] == ["a", "b", "c"]

    def test_open_biedingen_de_eerst_sluitende_voorop(self, zet, tabellen):
        zet("wijnen", {**BAROLO, "wijnId": "later", "eindtijd": "2026-11-22T22:00:00Z"})
        zet("wijnen", {**BAROLO, "wijnId": "eerder", "eindtijd": "2026-11-22T20:00:00Z"})
        zet("wijnen", {**BAROLO, "wijnId": "voorbij", "eindtijd": "2026-11-22T18:00:00Z"})
        zet("wijnen", {**BAROLO, "wijnId": "dicht", "biedingStatus": "gesloten"})
        zet("wijnen", VERDEJO)
        assert [w["wijnId"] for w in opslag.open_biedingen(tijd.iso(NU))] == ["eerder", "later"]

    def test_alle_paginas_worden_opgehaald(self, zet, tabellen):
        for i in range(5):
            zet("wijnen", {"wijnId": "w{}".format(i), "lijstId": "lijst-1", "volgorde": i})
        # Met twee per pagina zijn er drie pagina's nodig.
        items = opslag._alles(
            opslag._tabel("wijnen"), IndexName="lijst-index", KeyConditionExpression=Key("lijstId").eq("lijst-1"), Limit=2
        )
        assert [item["wijnId"] for item in items] == ["w0", "w1", "w2", "w3", "w4"]
