import json
import sys
import time
import urllib.error
import urllib.request

salida = sys.argv[1]
todos, cursor = [], None
while True:
    url = 'https://oss.exercisedb.dev/api/v1/exercises?limit=25' + (f'&after={cursor}' if cursor else '')
    for intento in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'body-rhythm'}), timeout=30) as r:
                d = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(5 * (intento + 1))
    else:
        raise SystemExit('demasiados 429')
    todos += d['data']
    cursor = d['meta'].get('nextCursor')
    print(len(todos), flush=True)
    if not d['meta'].get('hasNextPage') or not cursor:
        break
    time.sleep(1.2)
json.dump(todos, open(salida, 'w', encoding='utf-8'), ensure_ascii=False)
print('listo')
