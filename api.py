from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os, requests
app=FastAPI(title='Karaoke Dokotoku API')
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_methods=['*'],allow_headers=['*'])

def nominatim(q):
    r=requests.get('https://nominatim.openstreetmap.org/search',params={'format':'jsonv2','limit':1,'q':q},headers={'User-Agent':'KaraokeDokotoku/1.0'},timeout=20); r.raise_for_status(); a=r.json()
    if not a: raise HTTPException(404,'origin not found')
    return {'lat':float(a[0]['lat']),'lon':float(a[0]['lon']),'label':a[0].get('display_name')}
@app.get('/api/geocode')
def geocode(q:str): return nominatim(q)
@app.get('/api/route')
def route(mode:str,origin_lat:float,origin_lon:float,dest_lat:float,dest_lon:float):
    if mode in ('driving','foot'):
        r=requests.get(f'https://router.project-osrm.org/route/v1/{mode}/{origin_lon},{origin_lat};{dest_lon},{dest_lat}',params={'overview':'false'},timeout=30);r.raise_for_status();x=r.json()['routes'][0]
        return {'known':True,'minutes':x['duration']/60,'distanceKm':x['distance']/1000,'cost':x['distance']/1000*20 if mode=='driving' else 0}
    if mode=='transit':
        key=os.getenv('GOOGLE_ROUTES_API_KEY')
        if not key: return {'known':False,'minutes':0,'distanceKm':0,'cost':0}
        url='https://routes.googleapis.com/directions/v2:computeRoutes'
        headers={'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.duration,routes.distanceMeters,routes.travelAdvisory,routes.transitFare'}
        body={'origin':{'location':{'latLng':{'latitude':origin_lat,'longitude':origin_lon}}},'destination':{'location':{'latLng':{'latitude':dest_lat,'longitude':dest_lon}}},'travelMode':'TRANSIT','computeAlternativeRoutes':False}
        r=requests.post(url,headers=headers,json=body,timeout=30);r.raise_for_status();x=r.json()['routes'][0]
        dur=x.get('duration','0s'); sec=float(dur.rstrip('s')); fare=x.get('transitFare',{}).get('units',0)
        return {'known':True,'minutes':sec/60,'distanceKm':x.get('distanceMeters',0)/1000,'cost':float(fare)}
    raise HTTPException(400,'unsupported mode')
