"""De grens op het taalmodel, uitgevoerd tegen DynamoDB (moto): 100 aanroepen per dag, dan niet meer."""
from datetime import datetime, timedelta, timezone

from wijnclub import opslag
from wijnclub.domein import teller

NU = datetime(2026, 11, 21, 23, 0, tzinfo=timezone.utc)


def test_honderd_per_dag_en_de_volgende_dag_opnieuw(tabellen, lees):
    uitkomsten = [opslag.tel_modelaanroep(teller.tel_op(NU)) for _ in range(101)]
    assert uitkomsten.count(True) == 100
    assert uitkomsten[-1] is False

    rij = lees("tellers", tellerId="model#2026-11-21")
    assert rij["aantal"] == 100
    # De vervaltijd komt van de eerste aanroep en schuift niet op.
    assert rij["vervaltOp"] == teller.vervalt_op(NU)

    morgen = NU + timedelta(hours=2)
    assert opslag.tel_modelaanroep(teller.tel_op(morgen)) is True
    assert lees("tellers", tellerId="model#2026-11-22")["aantal"] == 1
