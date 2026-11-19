import os

# jsii waarschuwt bij een Node-versie die nog niet getest is. Voor de tests is dat ruis.
os.environ.setdefault("JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION", "1")
