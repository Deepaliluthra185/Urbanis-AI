import json
with open('Seismic_Zones.geojson') as f:
    data = json.load(f)
features = data['features']
print(f'Total features: {len(features)}')
zones = {}
null_count = 0
for feat in features:
    z = feat['properties'].get('seismic_zo')
    i = feat['properties'].get('intensity_')
    if z is None:
        null_count += 1
    else:
        zones[z] = i
print(f'Features with null seismic_zo: {null_count}')
print('Zones found:')
for z, i in sorted(zones.items()):
    print(f'  "{z}" -> "{i}"')
