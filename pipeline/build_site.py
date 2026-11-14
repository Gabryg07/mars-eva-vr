"""Turn fetched rasters (work/*.npy) into web assets for one site. Usage: build_site.py sites/<id>.json
Everything site-specific lives in the site json: point it at other coordinates/data and the same app runs there."""
import sys, json, math, os, numpy as np
from PIL import Image
from scipy import ndimage
Image.MAX_IMAGE_PIXELS=None
cfg=json.load(open(sys.argv[1])); W='/home/user/mars/work/'; OUT=f"/home/user/mars/app/public/sites/{cfg['id']}/"; os.makedirs(OUT,exist_ok=True)
R=cfg['radius_m']; lon0,lat0=cfg['lon0'],cfg['lat0']
def to_local(lon,lat):
    # orthographic projection about the site centre (true-scale metres, x east, y north)
    lam=math.radians(lon-lon0); phi=math.radians(lat); p0=math.radians(lat0)
    return (R*math.cos(phi)*math.sin(lam), R*(math.cos(p0)*math.sin(phi)-math.sin(p0)*math.cos(phi)*math.cos(lam)))
def fill(a):
    bad=~np.isfinite(a)|(a<-1e6)
    if bad.any():
        idx=ndimage.distance_transform_edt(bad,return_distances=False,return_indices=True); a=a[tuple(idx)]
    return a.astype(np.float32)
rings=[]; dems={}; orthos={}
for r in cfg['rings']:
    dems[r['name']]=fill(np.load(W+r['name']+'_dtm.npy')); orthos[r['name']]=np.load(W+r['name']+'_ortho.npy')
# --- tone-match outer rings to the inner one so the three orbital mosaics read as one surface
def sub(a,half_big,half_small):
    n=a.shape[0]; k=int(round(n*half_small/half_big/2)); c=n//2; return a[c-k:c+k,c-k:c+k]
def stats(a):
    v=a[a>0].astype(np.float32); return float(v.mean()),float(v.std())
names=[r['name'] for r in cfg['rings']]; halves={r['name']:r['half'] for r in cfg['rings']}
f32={names[0]:orthos[names[0]].astype(np.float32)}
for prev,cur in zip(names,names[1:]):
    m0,s0=stats(sub(f32[prev],halves[prev],halves[prev])) ; m1,s1=stats(sub(orthos[cur],halves[cur],halves[prev]))
    g=s0/max(s1,1e-3); f32[cur]=np.clip((orthos[cur].astype(np.float32)-m1)*g+m0,1,255)
    print('tone',cur,'gain',round(g,2),'offset',round(m0-m1*g,1))
for r in cfg['rings']:
    nme=r['name']; d=dems[nme]; n=d.shape[0]
    hmin=float(d.min()); hmax=float(d.max()); scale=(hmax-hmin)/65535.0
    q=np.round((d-hmin)/scale).astype('<u2'); q.tofile(OUT+f'{nme}_h.bin')
    # slope in degrees (0.5 deg steps in a byte)
    gy,gx=np.gradient(d,r['res']); slope=np.degrees(np.arctan(np.hypot(gx,gy)))
    Image.fromarray(np.clip(slope*2,0,255).astype(np.uint8)).save(OUT+f'{nme}_slope.png',optimize=True)
    np.save(W+f'{nme}_slope.npy',slope.astype(np.float32))
    o=f32[nme]; T=r['orthoTiles']; px=r['orthoPx']
    for ty in range(T):
        for tx in range(T):
            s=o.shape[0]//T; t=o[ty*s:(ty+1)*s,tx*s:(tx+1)*s]
            im=Image.fromarray(np.clip(t,0,255).astype(np.uint8))
            if im.size[0]!=px: im=im.resize((px,px),Image.LANCZOS)
            im.save(OUT+f'{nme}_ortho_{tx}_{ty}.jpg',quality=88,optimize=True)
    rings.append(dict(name=nme,half=r['half'],res=r['res'],n=n,tile=r['tile'],lods=r['lods'],lodDist=r['lodDist'],hmin=hmin,hscale=scale,
                      orthoTiles=T,slopeMax=float(slope.max())))
    print(nme,n,round(hmin,1),round(hmax,1),'slope p50/p95',np.percentile(slope,[50,95]).round(1))
# --- rover ground truth: Perseverance waypoints + traverse (NASA/JPL-Caltech MMGIS feed)
inner=dems['inner']; H=halves['inner']
def hgt(x,y):
    c=min(max(int(round(x+H)),0),inner.shape[1]-1); rr=min(max(int(round(H-y)),0),inner.shape[0]-1); return float(inner[rr,c])
wp=[]
for f in json.load(open('/home/user/mars/raw/M20_waypoints.json'))['features']:
    p=f['properties']; x,y=to_local(p['lon'],p['lat'])
    if max(abs(x),abs(y))>halves['mid']: continue
    e=dict(sol=p['sol'],x=round(x,2),y=round(y,2),elev=round(p['elev_geoid'],2),yaw=round(p.get('yaw') or 0,1),dist=round(p.get('dist_total_m') or 0))
    im=[i for i in (p.get('images') or []) if i.get('isPanoramic') and int(i.get('columns') or 0)>0]
    if im:
        i=im[0]; e['pano']=dict(file=i['url'].split('/')[-1],w=int(i['columns']),h=int(i['rows']),azmin=float(i['azmin']),azmax=float(i['azmax']),elmin=float(i['elmin']),elmax=float(i['elmax']))
    wp.append(e)
trav=[]
for f in json.load(open('/home/user/mars/raw/M20_traverse.json'))['features']:
    seg=[]
    for c in f['geometry']['coordinates']:
        x,y=to_local(c[0],c[1])
        if max(abs(x),abs(y))<=halves['mid']:
            if not seg or math.hypot(x-seg[-1][0],y-seg[-1][1])>2.0: seg.append([round(x,1),round(y,1)])
        elif seg: trav.append(seg); seg=[]
    if seg: trav.append(seg)
# check DEM vs rover elevation (validity check of the georeferencing)
inn=[w for w in wp if max(abs(w['x']),abs(w['y']))<H-5]
dz=np.array([hgt(w['x'],w['y'])-w['elev'] for w in inn]); print('rover-vs-DEM elevation diff (m): mean',dz.mean().round(2),'std',dz.std().round(2),'n',len(dz))
site=dict(id=cfg['id'],name=cfg['name'],lon0=lon0,lat0=lat0,radius=R,rings=rings,waypoints=wp,traverse=trav,
          georefCheck=dict(n=len(dz),meanDz=float(dz.mean()),stdDz=float(dz.std())))
json.dump(site,open(OUT+'site.json','w'),separators=(',',':'))
print('waypoints',len(wp),'traverse segs',len(trav),'pts',sum(map(len,trav)))
os.system(f'du -sh {OUT}; ls {OUT} | head -40')
