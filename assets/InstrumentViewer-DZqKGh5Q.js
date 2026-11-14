import{at as Tt,au as ns,av as gt,aw as ot,ax as le,ay as rs,az as ct,aA as Nt,V as w,aB as os,aC as jt,aD as bt,t as We,aE as is,aF as ce,aG as as,aH as ls,f as Ot,r as f,F as Ue,a as cs,aI as it,aJ as ds,m as us,D as hs,j as e,v as fs,aK as Rt,i as Ut,aL as Bt,u as kt,x as Gt,w as Ht,aM as vt,A as ps,M as ms,b as xs,d as gs,L as js,O as bs}from"./index-E4ZZIs4x.js";import{T as U,a as K,L as Wt}from"./labelFonts-DiG3SKJJ.js";const Ft=Tt>=125?"uv1":"uv2",yt=new ct,Ee=new w;class dt extends ns{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const t=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],n=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],o=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(o),this.setAttribute("position",new gt(t,3)),this.setAttribute("uv",new gt(n,2))}applyMatrix4(t){const n=this.attributes.instanceStart,o=this.attributes.instanceEnd;return n!==void 0&&(n.applyMatrix4(t),o.applyMatrix4(t),n.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(t){let n;t instanceof Float32Array?n=t:Array.isArray(t)&&(n=new Float32Array(t));const o=new ot(n,6,1);return this.setAttribute("instanceStart",new le(o,3,0)),this.setAttribute("instanceEnd",new le(o,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(t,n=3){let o;t instanceof Float32Array?o=t:Array.isArray(t)&&(o=new Float32Array(t));const s=new ot(o,n*2,1);return this.setAttribute("instanceColorStart",new le(s,n,0)),this.setAttribute("instanceColorEnd",new le(s,n,n)),this}fromWireframeGeometry(t){return this.setPositions(t.attributes.position.array),this}fromEdgesGeometry(t){return this.setPositions(t.attributes.position.array),this}fromMesh(t){return this.fromWireframeGeometry(new rs(t.geometry)),this}fromLineSegments(t){const n=t.geometry;return this.setPositions(n.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ct);const t=this.attributes.instanceStart,n=this.attributes.instanceEnd;t!==void 0&&n!==void 0&&(this.boundingBox.setFromBufferAttribute(t),yt.setFromBufferAttribute(n),this.boundingBox.union(yt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Nt),this.boundingBox===null&&this.computeBoundingBox();const t=this.attributes.instanceStart,n=this.attributes.instanceEnd;if(t!==void 0&&n!==void 0){const o=this.boundingSphere.center;this.boundingBox.getCenter(o);let s=0;for(let i=0,u=t.count;i<u;i++)Ee.fromBufferAttribute(t,i),s=Math.max(s,o.distanceToSquared(Ee)),Ee.fromBufferAttribute(n,i),s=Math.max(s,o.distanceToSquared(Ee));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(t){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(t)}}class $t extends dt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(t){const n=t.length-3,o=new Float32Array(2*n);for(let s=0;s<n;s+=3)o[2*s]=t[s],o[2*s+1]=t[s+1],o[2*s+2]=t[s+2],o[2*s+3]=t[s+3],o[2*s+4]=t[s+4],o[2*s+5]=t[s+5];return super.setPositions(o),this}setColors(t,n=3){const o=t.length-n,s=new Float32Array(2*o);if(n===3)for(let i=0;i<o;i+=n)s[2*i]=t[i],s[2*i+1]=t[i+1],s[2*i+2]=t[i+2],s[2*i+3]=t[i+3],s[2*i+4]=t[i+4],s[2*i+5]=t[i+5];else for(let i=0;i<o;i+=n)s[2*i]=t[i],s[2*i+1]=t[i+1],s[2*i+2]=t[i+2],s[2*i+3]=t[i+3],s[2*i+4]=t[i+4],s[2*i+5]=t[i+5],s[2*i+6]=t[i+6],s[2*i+7]=t[i+7];return super.setColors(s,n),this}fromLine(t){const n=t.geometry;return this.setPositions(n.attributes.position.array),this}}class ut extends os{constructor(t){super({type:"LineMaterial",uniforms:jt.clone(jt.merge([bt.common,bt.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new We(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${Tt>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(n){this.uniforms.diffuse.value=n}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(n){n===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(n){this.uniforms.linewidth.value=n}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(n){!!n!="USE_DASH"in this.defines&&(this.needsUpdate=!0),n===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(n){this.uniforms.dashScale.value=n}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(n){this.uniforms.dashSize.value=n}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(n){this.uniforms.dashOffset.value=n}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(n){this.uniforms.gapSize.value=n}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(n){this.uniforms.opacity.value=n}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(n){this.uniforms.resolution.value.copy(n)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(n){!!n!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),n===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(t)}}const qe=new ce,St=new w,wt=new w,I=new ce,C=new ce,G=new ce,Je=new w,Ze=new ls,A=new as,Mt=new w,_e=new ct,Pe=new Nt,H=new ce;let X,ee;function Et(r,t,n){return H.set(0,0,-t,1).applyMatrix4(r.projectionMatrix),H.multiplyScalar(1/H.w),H.x=ee/n.width,H.y=ee/n.height,H.applyMatrix4(r.projectionMatrixInverse),H.multiplyScalar(1/H.w),Math.abs(Math.max(H.x,H.y))}function vs(r,t){const n=r.matrixWorld,o=r.geometry,s=o.attributes.instanceStart,i=o.attributes.instanceEnd,u=Math.min(o.instanceCount,s.count);for(let a=0,h=u;a<h;a++){A.start.fromBufferAttribute(s,a),A.end.fromBufferAttribute(i,a),A.applyMatrix4(n);const l=new w,c=new w;X.distanceSqToSegment(A.start,A.end,c,l),c.distanceTo(l)<ee*.5&&t.push({point:c,pointOnLine:l,distance:X.origin.distanceTo(c),object:r,face:null,faceIndex:a,uv:null,[Ft]:null})}}function ys(r,t,n){const o=t.projectionMatrix,i=r.material.resolution,u=r.matrixWorld,a=r.geometry,h=a.attributes.instanceStart,l=a.attributes.instanceEnd,c=Math.min(a.instanceCount,h.count),p=-t.near;X.at(1,G),G.w=1,G.applyMatrix4(t.matrixWorldInverse),G.applyMatrix4(o),G.multiplyScalar(1/G.w),G.x*=i.x/2,G.y*=i.y/2,G.z=0,Je.copy(G),Ze.multiplyMatrices(t.matrixWorldInverse,u);for(let x=0,z=c;x<z;x++){if(I.fromBufferAttribute(h,x),C.fromBufferAttribute(l,x),I.w=1,C.w=1,I.applyMatrix4(Ze),C.applyMatrix4(Ze),I.z>p&&C.z>p)continue;if(I.z>p){const j=I.z-C.z,L=(I.z-p)/j;I.lerp(C,L)}else if(C.z>p){const j=C.z-I.z,L=(C.z-p)/j;C.lerp(I,L)}I.applyMatrix4(o),C.applyMatrix4(o),I.multiplyScalar(1/I.w),C.multiplyScalar(1/C.w),I.x*=i.x/2,I.y*=i.y/2,C.x*=i.x/2,C.y*=i.y/2,A.start.copy(I),A.start.z=0,A.end.copy(C),A.end.z=0;const m=A.closestPointToPointParameter(Je,!0);A.at(m,Mt);const b=Ot.lerp(I.z,C.z,m),T=b>=-1&&b<=1,R=Je.distanceTo(Mt)<ee*.5;if(T&&R){A.start.fromBufferAttribute(h,x),A.end.fromBufferAttribute(l,x),A.start.applyMatrix4(u),A.end.applyMatrix4(u);const j=new w,L=new w;X.distanceSqToSegment(A.start,A.end,L,j),n.push({point:L,pointOnLine:j,distance:X.origin.distanceTo(L),object:r,face:null,faceIndex:x,uv:null,[Ft]:null})}}}class Vt extends is{constructor(t=new dt,n=new ut({color:Math.random()*16777215})){super(t,n),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const t=this.geometry,n=t.attributes.instanceStart,o=t.attributes.instanceEnd,s=new Float32Array(2*n.count);for(let u=0,a=0,h=n.count;u<h;u++,a+=2)St.fromBufferAttribute(n,u),wt.fromBufferAttribute(o,u),s[a]=a===0?0:s[a-1],s[a+1]=s[a]+St.distanceTo(wt);const i=new ot(s,2,1);return t.setAttribute("instanceDistanceStart",new le(i,1,0)),t.setAttribute("instanceDistanceEnd",new le(i,1,1)),this}raycast(t,n){const o=this.material.worldUnits,s=t.camera;s===null&&!o&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const i=t.params.Line2!==void 0&&t.params.Line2.threshold||0;X=t.ray;const u=this.matrixWorld,a=this.geometry,h=this.material;ee=h.linewidth+i,a.boundingSphere===null&&a.computeBoundingSphere(),Pe.copy(a.boundingSphere).applyMatrix4(u);let l;if(o)l=ee*.5;else{const p=Math.max(s.near,Pe.distanceToPoint(X.origin));l=Et(s,p,h.resolution)}if(Pe.radius+=l,X.intersectsSphere(Pe)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),_e.copy(a.boundingBox).applyMatrix4(u);let c;if(o)c=ee*.5;else{const p=Math.max(s.near,_e.distanceToPoint(X.origin));c=Et(s,p,h.resolution)}_e.expandByScalar(c),X.intersectsBox(_e)!==!1&&(o?vs(this,n):ys(this,s,n))}onBeforeRender(t){const n=this.material.uniforms;n&&n.resolution&&(t.getViewport(qe),this.material.uniforms.resolution.value.set(qe.z,qe.w))}}class Ss extends Vt{constructor(t=new $t,n=new ut({color:Math.random()*16777215})){super(t,n),this.isLine2=!0,this.type="Line2"}}const ws=f.forwardRef(function({points:t,color:n=16777215,vertexColors:o,linewidth:s,lineWidth:i,segments:u,dashed:a,...h},l){var c,p;const x=Ue(T=>T.size),z=f.useMemo(()=>u?new Vt:new Ss,[u]),[y]=f.useState(()=>new ut),m=(o==null||(c=o[0])==null?void 0:c.length)===4?4:3,b=f.useMemo(()=>{const T=u?new dt:new $t,R=t.map(j=>{const L=Array.isArray(j);return j instanceof w||j instanceof ce?[j.x,j.y,j.z]:j instanceof We?[j.x,j.y,0]:L&&j.length===3?[j[0],j[1],j[2]]:L&&j.length===2?[j[0],j[1],0]:j});if(T.setPositions(R.flat()),o){n=16777215;const j=o.map(L=>L instanceof cs?L.toArray():L);T.setColors(j.flat(),m)}return T},[t,u,o,m]);return f.useLayoutEffect(()=>{z.computeLineDistances()},[t,z]),f.useLayoutEffect(()=>{a?y.defines.USE_DASH="":delete y.defines.USE_DASH,y.needsUpdate=!0},[a,y]),f.useEffect(()=>()=>{b.dispose(),y.dispose()},[b]),f.createElement("primitive",it({object:z,ref:l},h),f.createElement("primitive",{object:b,attach:"geometry"}),f.createElement("primitive",it({object:y,attach:"material",color:n,vertexColors:!!o,resolution:[x.width,x.height],linewidth:(p=s??i)!==null&&p!==void 0?p:1,dashed:a,transparent:m===4},h)))}),Ms=f.forwardRef(({threshold:r=15,geometry:t,...n},o)=>{const s=f.useRef(null);f.useImperativeHandle(o,()=>s.current,[]);const i=f.useMemo(()=>[0,0,0,1,0,0],[]),u=f.useRef(),a=f.useRef();return f.useLayoutEffect(()=>{const h=s.current.parent,l=t??(h==null?void 0:h.geometry);if(!l||u.current===l&&a.current===r)return;u.current=l,a.current=r;const p=new ds(l,r).attributes.position.array;s.current.geometry.setPositions(p),s.current.geometry.attributes.instanceStart.needsUpdate=!0,s.current.geometry.attributes.instanceEnd.needsUpdate=!0,s.current.computeLineDistances()}),f.createElement(ws,it({segments:!0,points:i,ref:s,raycast:()=>null},n))}),Es={rbc:{bulbLen:2.2,bulbR:.4,bore:.03,bead:[.2,.1],beadColor:"#8b1a1a",topMark:"101",mouth:"#e11d27"},wbc:{bulbLen:1.8,bulbR:.33,bore:.06,bead:[.15,.095],beadColor:"#f8fafc",topMark:"11",mouth:"#f4f4f5"}},$=.2,Le=.5,W=6,_s=1.7,Qe=.7,q=.25,at="#1e3a8a",V="#3b82f6",de=({points:r,x0:t,children:n,userData:o})=>{const s=f.useMemo(()=>new fs(r.map(([i,u])=>new We(i,u)),48),[r]);return e.jsx("mesh",{geometry:s,position:[t,0,0],rotation:[0,0,-Math.PI/2],userData:o,children:n})},Ps=r=>{for(let t=r;t;t=t.parent)if(t.userData.part)return t.userData;return null},_t=r=>{var n;const t=r.intersections.map(o=>Ps(o.object)).filter(o=>!!o);return((n=t.find(o=>!o.glass)??t[0])==null?void 0:n.part)??null},ze=({lit:r})=>e.jsx("meshPhysicalMaterial",{color:r?V:"#ffffff",transparent:!0,opacity:r?.6:.22,roughness:.03,metalness:0,clearcoat:1,envMapIntensity:1.6,side:Rt,depthWrite:!1,emissive:r?V:"#000000",emissiveIntensity:r?.7:0}),et=({at:r,children:t,lit:n})=>e.jsx(U,{font:K,position:[r,0,$+.012],rotation:[0,0,-Math.PI/2],fontSize:.22,color:n?V:at,anchorX:"center",anchorY:"middle",children:t}),Pt=({kind:r,active:t,onHover:n,onSelect:o})=>{const s=Es[r],i=W+s.bulbLen,u=i+.3,a=i+_s,h=-a/2-.6,l=m=>h+m,c=m=>t===m,p=f.useMemo(()=>{const m=[];for(let b=0;b<=40;b++){const T=b/40;m.push([$+(s.bulbR-$)*Math.pow(Math.sin(Math.PI*T),1.6),W+s.bulbLen*T])}return{tip:[[.05,0],[.12,Le*.6],[$,Le]],stem:[[$,Le],[$,W]],bulb:m,neck:[[$,i],[$,a]],sleeve:[[q+.03,a-Qe],[q,a-Qe+.12],[q,a+.05]]}},[s.bulbLen,s.bulbR,i,a]),x=f.useMemo(()=>{const m=l(a),b=new us([new w(m,0,0),new w(m+.9,0,-.05),new w(m+1.7,-.5,-.1),new w(m+1.75,-1.5,0),new w(m+.8,-2.1,.15),new w(m-1.6,-2.25,.15),new w(m-4.2,-2.05,0)]),T=b.getPoint(1),R=b.getTangent(1);return{geometry:new hs(b,120,q*.76,16,!1),end:T,angle:Math.atan2(R.y,R.x)}},[a,h]),z=Array.from({length:10},(m,b)=>(b+1)*(W/10)),y=(m,b)=>e.jsxs("mesh",{position:[l((m+b)/2),0,-.07],children:[e.jsx("boxGeometry",{args:[b-m,.3,.05]}),e.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.55})]});return e.jsxs("group",{onPointerMove:m=>{m.stopPropagation(),n(_t(m))},onPointerOut:()=>n(null),onClick:m=>{m.stopPropagation();const b=_t(m);b&&o(b)},children:[e.jsx(de,{points:p.tip,x0:h,userData:{part:"tip",glass:!0},children:e.jsx(ze,{lit:c("tip")})}),e.jsx(de,{points:p.stem,x0:h,userData:{part:"stem",glass:!0},children:e.jsx(ze,{lit:c("stem")})}),e.jsx(de,{points:p.bulb,x0:h,userData:{part:"bulb",glass:!0},children:e.jsx(ze,{lit:c("bulb")})}),e.jsx(de,{points:p.neck,x0:h,userData:{part:"top-mark",glass:!0},children:e.jsx(ze,{lit:c("top-mark")})}),y(Le*.8,W),y(i,a-Qe),e.jsxs("mesh",{position:[l(W/2+.1),0,0],rotation:[0,0,Math.PI/2],userData:{part:"stem"},children:[e.jsx("cylinderGeometry",{args:[s.bore,s.bore,W-.2,12]}),e.jsx("meshStandardMaterial",{color:c("stem")?V:"#9aa9b8"})]}),e.jsxs("group",{userData:{part:"marks"},children:[z.map(m=>e.jsx("group",{position:[l(m),0,0],rotation:[0,Math.PI/2,0],children:e.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[$+.004,.009,4,24,Math.PI]}),e.jsx("meshBasicMaterial",{color:c("marks")?V:at})]})},m)),e.jsx(et,{at:l(W/2-.22),lit:c("marks"),children:"0.5"}),e.jsx(et,{at:l(W-.2),lit:c("marks"),children:"1"})]}),e.jsxs("group",{userData:{part:"top-mark"},children:[e.jsx("group",{position:[l(u),0,0],rotation:[0,Math.PI/2,0],children:e.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[$+.004,.009,4,24,Math.PI]}),e.jsx("meshBasicMaterial",{color:c("top-mark")?V:at})]})}),e.jsx(et,{at:l(u+.26),lit:c("top-mark"),children:s.topMark})]}),e.jsxs("mesh",{position:[l(W+s.bulbLen*.5),-(s.bulbR-s.bead[1]-.06),0],scale:[s.bead[0],s.bead[1],s.bead[1]],userData:{part:"bead"},children:[e.jsx("sphereGeometry",{args:[1,32,24]}),e.jsx("meshStandardMaterial",{color:s.beadColor,roughness:.3,emissive:c("bead")?V:"#000000",emissiveIntensity:c("bead")?.6:0})]}),e.jsxs("group",{userData:{part:"tube"},children:[e.jsx(de,{points:p.sleeve,x0:h,children:e.jsx(Lt,{lit:c("tube")})}),e.jsx("mesh",{geometry:x.geometry,children:e.jsx(Lt,{lit:c("tube")})})]}),e.jsxs("group",{position:[x.end.x,x.end.y,x.end.z],rotation:[0,0,x.angle-Math.PI/2],userData:{part:"mouthpiece"},children:[e.jsxs("mesh",{position:[0,.08,0],children:[e.jsx("cylinderGeometry",{args:[q*1.15,q*1.15,.16,24]}),e.jsx("meshStandardMaterial",{color:c("mouthpiece")?V:s.mouth,roughness:.35})]}),e.jsxs("mesh",{position:[0,.42,0],children:[e.jsx("cylinderGeometry",{args:[q*.95,q*.8,.55,24]}),e.jsx("meshStandardMaterial",{color:c("mouthpiece")?V:s.mouth,roughness:.35})]})]})]})},Lt=({lit:r})=>e.jsx("meshPhysicalMaterial",{color:r?V:"#e3d6b4",roughness:.4,transparent:!0,opacity:.82,clearcoat:.4}),Ie=75,zt=33,ue=6,tt=3,Ce=1,Ls=7.6,zs="#2f3f9e",De=.02,Ae=r=>({polygonOffset:!0,polygonOffsetFactor:-r,polygonOffsetUnits:-4*r}),J="#3b82f6",Is=(()=>{let r=null;return()=>{if(r)return r;const t=2048,n=t/3,o=document.createElement("canvas");o.width=o.height=t;const s=o.getContext("2d");s.strokeStyle="rgba(15, 23, 42, 0.85)";const i=(a,h,l,c,p)=>{s.lineWidth=p,s.beginPath(),s.moveTo(a*n,h*n),s.lineTo(l*n,c*n),s.stroke()},u=(a,h,l,c)=>{for(const p of[-.0125,0,.0125])h?i(a+p,l,a+p,c,3):i(l,a+p,c,a+p,3)};for(let a=0;a<=3;a++)u(a,!0,0,3),u(a,!1,0,3);for(const[a,h]of[[0,0],[2,0],[0,2],[2,2]])for(let l=1;l<4;l++)i(a+l/4,h,a+l/4,h+1,2.5),i(a,h+l/4,a+1,h+l/4,2.5);for(let a=1;a<5;a++)u(1+a/5,!0,0,3),u(1+a/5,!1,0,3);for(let a=1;a<20;a++)a%4!==0&&(i(1+a/20,1,1+a/20,2,1.5),i(1,1+a/20,2,1+a/20,1.5));for(let a=1;a<4;a++)i(1,a/4,2,a/4,2.5),i(1,2+a/4,2,2+a/4,2.5),i(a/4,1,a/4,2,2.5),i(2+a/4,1,2+a/4,2,2.5);return r=new Ut(o),r.anisotropy=8,r.colorSpace=Bt,r}})(),Cs=r=>{for(let t=r;t;t=t.parent)if(t.userData.part)return t.userData;return null},It=r=>{var n;const t=r.intersections.map(o=>Cs(o.object)).filter(o=>!!o);return((n=t.find(o=>!o.glass)??t[0])==null?void 0:n.part)??null},Te=({lit:r,opacity:t=.38})=>e.jsx("meshPhysicalMaterial",{color:r?J:"#fbf1f7",transparent:!0,opacity:r?.6:t,roughness:.06,metalness:0,clearcoat:1,envMapIntensity:1.4,depthWrite:!1,emissive:r?J:"#000000",emissiveIntensity:r?.6:0}),Ne=({x:r,y:t,z:n,children:o,part:s})=>e.jsxs("mesh",{position:[(r[0]+r[1])/2,(t[0]+t[1])/2,(n[0]+n[1])/2],userData:s,children:[e.jsx("boxGeometry",{args:[r[1]-r[0],t[1]-t[0],n[1]-n[0]]}),o]}),st=({x:r,z:t,size:n,lit:o,children:s})=>e.jsx(U,{font:Wt,position:[r,.05,t],rotation:[-Math.PI/2,0,0],fontSize:n,color:o?J:zs,anchorX:"center",anchorY:"middle",textAlign:"center",lineHeight:1.15,children:s}),Ds=({active:r,onHover:t,onSelect:n})=>{const o=l=>r===l,s=f.useMemo(Is,[]),i=ue+tt,u=zt/2,a=-.1,h=-1;return e.jsxs("group",{onPointerMove:l=>{l.stopPropagation(),t(It(l))},onPointerOut:()=>t(null),onClick:l=>{l.stopPropagation();const c=It(l);c&&n(c)},children:[e.jsx(Ne,{x:[-Ie/2,Ie/2],y:[-4,h],z:[-u,u],part:{part:"slide",glass:!0},children:e.jsx(Te,{lit:o("slide")})}),[-1,1].map(l=>e.jsx(Ne,{x:l<0?[-Ie/2,-i]:[i,Ie/2],y:[h,0],z:[-u,u],part:{part:"platforms",glass:!0},children:e.jsx(Te,{lit:o("platforms")})},l)),[-1,1].map(l=>e.jsx(Ne,{x:[-ue,ue],y:[h,a],z:l<0?[-u,-Ce]:[Ce,u],part:{part:"central",glass:!0},children:e.jsx(Te,{lit:o("central")})},l)),[-1,1].map(l=>e.jsxs("mesh",{position:[0,a+De,l*(Ce+6.5)],rotation:[-Math.PI/2,0,0],userData:{part:"central"},children:[e.jsx("planeGeometry",{args:[7,12.6]}),e.jsx("meshStandardMaterial",{color:o("central")?J:"#a7afb4",metalness:.85,roughness:.28,...Ae(1)})]},l)),[-1,1].map(l=>e.jsxs("mesh",{position:[0,a+2*De,l*Ls],rotation:[-Math.PI/2,0,0],userData:{part:"grid"},children:[e.jsx("planeGeometry",{args:[3,3]}),e.jsx("meshBasicMaterial",{map:s,transparent:!0,color:o("grid")?J:"#ffffff",...Ae(2)})]},l)),e.jsxs("group",{userData:{part:"moats"},children:[[-1,1].map(l=>e.jsxs("mesh",{position:[l*(ue+tt/2),h+De,0],rotation:[-Math.PI/2,0,0],children:[e.jsx("planeGeometry",{args:[tt,zt]}),e.jsx("meshStandardMaterial",{color:o("moats")?J:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...Ae(1)})]},l)),e.jsxs("mesh",{position:[0,h+De,0],rotation:[-Math.PI/2,0,0],children:[e.jsx("planeGeometry",{args:[ue*2,Ce*2]}),e.jsx("meshStandardMaterial",{color:o("moats")?J:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...Ae(1)})]})]}),e.jsxs("group",{userData:{part:"print"},children:[e.jsx(st,{x:-23,z:-6,size:2.4,lit:o("print"),children:`Tiefe
Depth
Profondeur
0.100mm`}),e.jsx(st,{x:-23,z:11,size:2.4,lit:o("print"),children:"0.0025mm²"}),e.jsx(st,{x:23,z:-7,size:2.2,lit:o("print"),children:`NEUBAUER
IMPROVED
BRIGHT-LINE`})]}),e.jsxs(Ne,{x:[-11,11],y:[0,.4],z:[-11,11],part:{part:"coverslip",glass:!0},children:[e.jsx(Te,{lit:o("coverslip"),opacity:.18}),e.jsx(Ms,{color:o("coverslip")?J:"#8fa0b4",lineWidth:o("coverslip")?2.5:1.5})]})]})},ke=[.12,.25,1.25,2.5,12.5,25,320,640],As=8,re=7.5,B=15,Ge=7.56,Ts=2*Math.PI*re*10,g={w:19,h:19,d:19,y0:1.2},Xt=g.y0+g.h,O=Xt+.6,F=g.d/2,Be=O+3,Yt=9,he=Be+Yt+B+2.5,D=new w(21,34.5,Ge+.32),fe=D.x,ve=2.2,lt=3,ye="#3b82f6",oe=-2.35,nt=.6+oe,te=1536,He=te/(2*Math.PI*Ge),Q=Math.round(B*He),Ct=Math.round(1.2*He),Ns=r=>{r.globalCompositeOperation="source-over",r.fillStyle="#17150f",r.fillRect(0,0,te,Q);for(let t=0;t<260;t++){const n=Math.random()*te,o=Math.random()*Q,s=8+Math.random()*60,i=r.createRadialGradient(n,o,0,n,o,s),u=Math.random()<.5?"40,36,28":"6,6,5";i.addColorStop(0,`rgba(${u},${.08+Math.random()*.1})`),i.addColorStop(1,`rgba(${u},0)`),r.fillStyle=i,r.fillRect(n-s,o-s,2*s,2*s)}for(let t=0;t<9e3;t++)r.fillStyle=Math.random()<.5?"rgba(60,55,45,0.25)":"rgba(0,0,0,0.3)",r.fillRect(Math.random()*te,Math.random()*Q,1.2,1.2);r.fillStyle="rgba(0,0,0,0.35)",r.fillRect(0,0,Ct,Q),r.fillStyle="rgba(120,112,95,0.55)",r.fillRect(Ct-2,0,2,Q)},Os=r=>{const t=r-.01;return t<=0||t>=.09?0:t<.04?lt*Math.sin(Math.PI/2*(t/.04))**2:lt*Math.cos(Math.PI/2*((t-.04)/.05))**2},Rs=()=>{const[r,t]=f.useState({on:!1,speed:6,clutch:!0,lift:3.5,leverOn:!0,contactStim:!1}),n=f.useRef([]),o=f.useRef(0),[s,i]=f.useState(0),u=f.useCallback(h=>t(l=>({...l,...h})),[]),a=f.useCallback(()=>{n.current.push(o.current)},[]);return{state:r,set:u,stimulate:a,stimuli:n,clock:o,paperKey:s,newPaper:()=>i(h=>h+1)}},Kt=r=>r.on&&r.clutch&&r.speed!==As,Us=r=>{for(let t=r;t;t=t.parent)if(t.userData.part)return t.userData.part;return null},Dt=r=>{for(const t of r.intersections){const n=Us(t.object);if(n)return n}return null},P=({lit:r,color:t,metal:n=.3,rough:o=.55})=>e.jsx("meshStandardMaterial",{color:r?ye:t,metalness:r?.1:n,roughness:o,emissive:r?ye:"#000000",emissiveIntensity:r?.35:0}),E=({lit:r})=>e.jsx(P,{lit:r,color:"#dfe3e7",metal:1,rough:.15}),pe=({lit:r})=>e.jsx(P,{lit:r,color:"#c9cdd1",metal:.85,rough:.35}),me=({lit:r})=>e.jsx(P,{lit:r,color:"#c9a24a",metal:.9,rough:.3}),Y=({lit:r})=>e.jsx(P,{lit:r,color:"#1d1f22",metal:.2,rough:.45}),Oe=({lit:r})=>e.jsx(P,{lit:r,color:"#ecebe5",metal:.05,rough:.45}),S=({r,h:t,pos:n,rot:o,seg:s=32,r2:i,children:u})=>e.jsxs("mesh",{position:n,rotation:o,children:[e.jsx("cylinderGeometry",{args:[i??r,r,t,s]}),u]}),v=({size:r,pos:t,rot:n,children:o})=>e.jsxs("mesh",{position:t,rotation:n,children:[e.jsx("boxGeometry",{args:r}),o]}),xe=({r,h:t,pos:n,rot:o,lit:s,color:i="#dfe3e7"})=>{const u=f.useMemo(()=>{const a=[];for(let c=0;c<=80;c++){const p=c/80*Math.PI*2,x=c%2?r:r*.92;a.push(new We(Math.cos(p)*x,Math.sin(p)*x))}const l=new Gt(new Ht(a),{depth:t,bevelEnabled:!0,bevelSize:r*.04,bevelThickness:r*.04,bevelSegments:1});return l.translate(0,0,-t/2),l.rotateX(Math.PI/2),l},[r,t]);return e.jsx("mesh",{geometry:u,position:n,rotation:o,children:e.jsx(P,{lit:s,color:i,metal:.9,rough:.3})})},ge=({w:r,h:t,lit:n})=>e.jsx(e.Fragment,{children:[[-1,-1],[1,-1],[-1,1],[1,1]].map(([o,s],i)=>e.jsxs("mesh",{position:[o*(r/2-.9),s*(t/2-.9),.02],scale:[1,1,.45],children:[e.jsx("sphereGeometry",{args:[.32,14,8,0,Math.PI*2,0,Math.PI/2]}),e.jsx(P,{lit:n,color:"#9aa0a6",metal:.9,rough:.3})]},i))}),Bs=16.9,ks=.72,je=r=>Bs-r*ks,Gs=({active:r,onHover:t,onSelect:n,kymo:o})=>{const s=d=>r===d,{state:i,stimuli:u,clock:a,paperKey:h}=o,l=f.useRef(i);l.current=i;const c=f.useMemo(()=>{const d=document.createElement("canvas");return d.width=te,d.height=Q,d},[]),p=f.useMemo(()=>{const d=new Ut(c);return d.colorSpace=Bt,d.anisotropy=8,d},[c]),x=f.useRef(null);f.useMemo(()=>{Ns(c.getContext("2d")),p.needsUpdate=!0,x.current=null},[h,c,p]);const z=f.useRef(null),y=f.useRef(null),m=f.useRef(null),b=f.useRef(null),T=f.useRef(null),R=f.useRef(null),j=f.useRef(null),L=f.useRef(null),Fe=f.useRef(null),$e=f.useRef(null),Ve=f.useRef(null),qt=f.useRef({phi:0,rate:0,lift:i.lift,swing:0,slot:je(i.speed),clutch:1,t:performance.now()/1e3,flash:0,dirty:0});kt(()=>{const d=qt.current,M=l.current,k=c.getContext("2d"),ft=performance.now()/1e3,se=Math.min(.1,ft-d.t);d.t=ft;const Xe=a.current+se,Jt=Kt(M)?ke[M.speed]/10/re:0,Se=N=>Math.min(1,se*N);d.lift+=(M.lift-d.lift)*Se(6),d.swing+=((M.leverOn?0:1)-d.swing)*Se(5),d.slot+=(je(M.speed)-d.slot)*Se(12),d.clutch+=((M.clutch?1:0)-d.clutch)*Se(10),k.strokeStyle="rgba(236,230,214,0.92)",k.lineWidth=2.2,k.lineCap="round",k.lineJoin="round",k.beginPath();let Ye=!1;const pt=Math.max(1,Math.ceil(se/.002)),Ke=se/pt;let we=0;for(let N=1;N<=pt;N++){const xt=Xe-se+N*Ke;d.rate+=(Jt-d.rate)*Math.min(1,Ke*8),d.rate<1e-5&&(d.rate=0);const Qt=d.phi;if(d.phi-=d.rate*Ke,d.rate>0&&Math.floor((-Qt-nt+oe)/(2*Math.PI))!==Math.floor((-d.phi-nt+oe)/(2*Math.PI))&&(d.flash=1,M.contactStim&&u.current.push(xt)),we=Math.min(u.current.reduce((ts,ss)=>ts+Os(xt-ss),0),lt*1.6),d.swing>.04){x.current=null;continue}const es=D.y+we,ne=(Be+d.lift+B-es)*He,Me=(-d.phi%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*te;if(ne<2||ne>Q-2){x.current=null;continue}const Z=x.current;Z&&Math.abs(Me-Z.u)<te/2&&Math.abs(ne-Z.v)<1.5*He&&(Math.abs(Me-Z.u)>.05||Math.abs(ne-Z.v)>.05)&&(k.moveTo(Z.u,Z.v),k.lineTo(Me,ne),Ye=!0),x.current={u:Me,v:ne}}Ye&&(k.stroke(),d.dirty++),d.dirty&&(d.dirty>1||!Ye)&&(p.needsUpdate=!0,d.dirty=0),u.current=u.current.filter(N=>Xe-N<.2),a.current=Xe,z.current&&(z.current.rotation.y=d.phi),y.current&&(y.current.position.y=Be+d.lift),b.current&&(b.current.rotation.y=d.swing*.07),m.current&&(m.current.rotation.z=-Math.asin(we/fe)),j.current&&(j.current.position.y=d.slot),L.current&&(L.current.rotation.z=.7-1.4*(1-d.clutch)),Fe.current&&(Fe.current.rotation.x=M.on?-.22:.22);const mt=we*ve/fe,Zt=D.y-.3-mt;if(R.current){const N=Zt-rt;R.current.scale.y=N,R.current.position.y=rt+N/2}if(T.current){const N=mt/ie;T.current.scale.set(1+N*2.5,1-N,1+N*2.5)}$e.current&&($e.current.emissiveIntensity=M.on?1.6:0),d.flash=Math.max(0,d.flash-se*8),Ve.current&&(Ve.current.emissiveIntensity=d.flash*3)});const ht=[Math.sin(oe),Math.cos(oe)];return e.jsxs("group",{onPointerMove:d=>{d.stopPropagation(),t(Dt(d))},onPointerOut:()=>t(null),onClick:d=>{d.stopPropagation();const M=Dt(d);M&&n(M)},children:[e.jsxs("mesh",{position:[7,-.5,2],children:[e.jsx("boxGeometry",{args:[60,1,38]}),e.jsx("meshStandardMaterial",{color:"#8a6a4a",roughness:.8})]}),e.jsxs("group",{userData:{part:"base"},children:[e.jsx(v,{size:[g.w,g.h,g.d],pos:[0,g.y0+g.h/2,0],children:e.jsx(Oe,{lit:s("base")})}),e.jsx(v,{size:[g.w+.6,.6,g.d+.6],pos:[0,Xt+.3,0],children:e.jsx(Oe,{lit:s("base")})}),e.jsx(v,{size:[g.w+.3,.5,g.d+.3],pos:[0,g.y0+.25,0],children:e.jsx(Oe,{lit:s("base")})}),[[-1,-1],[1,-1],[-1,1],[1,1]].map(([d,M],k)=>e.jsx(S,{r:1.1,r2:1.2,h:1.2,pos:[d*(g.w/2-1.8),.6,M*(g.d/2-1.8)],children:e.jsx(Y,{lit:s("base")})},k)),e.jsx("group",{position:[0,g.y0+g.h/2,F+.01],children:e.jsx(ge,{w:g.w,h:g.h,lit:s("base")})}),e.jsx("group",{position:[g.w/2+.01,g.y0+g.h/2,0],rotation:[0,Math.PI/2,0],children:e.jsx(ge,{w:g.d,h:g.h,lit:s("base")})}),e.jsx("group",{position:[-19/2-.01,g.y0+g.h/2,0],rotation:[0,-Math.PI/2,0],children:e.jsx(ge,{w:g.d,h:g.h,lit:s("base")})}),e.jsx("group",{position:[0,O+.01,0],rotation:[-Math.PI/2,0,0],children:e.jsx(ge,{w:g.w+.6,h:g.d+.6,lit:s("base")})}),[-1,1].map(d=>[0,1,2,3,4,5].map(M=>e.jsx(v,{size:[.35,.45,4.2],pos:[-19/2-.12,g.y0+5+M*1.3,d*3.2],rot:[0,0,.5],children:e.jsx(Oe,{lit:s("base")})},`${d}${M}`))),e.jsx(xe,{r:.6,h:.7,pos:[6.5,O+.35,6],lit:s("base")})]}),e.jsxs("group",{userData:{part:"speed"},children:[e.jsxs("group",{position:[0,14,F+.06],children:[e.jsx(v,{size:[5.8,10.4,.12],pos:[0,0,0],children:e.jsx(P,{lit:s("speed"),color:"#141517",metal:.3,rough:.5})}),e.jsx(ge,{w:5.8,h:10.4,lit:s("speed")}),e.jsx(U,{font:K,position:[0,4.5,.08],fontSize:.36,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"SPEED MM PER SEC."}),e.jsx(U,{font:K,position:[0,3.95,.08],fontSize:.3,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:'WITH 6" DIA CYLINDER'}),e.jsx(U,{font:K,position:[0,-4.25,.08],fontSize:.32,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"E-8 RECORDING DRUM"}),e.jsx(U,{font:Wt,position:[0,-4.75,.08],fontSize:.28,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"220 V AC"}),e.jsx(v,{size:[.75,7.3,.05],pos:[-1,je(4)-14,.07],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),[...ke.map(String),"N"].map((d,M)=>e.jsxs("group",{position:[0,je(M)-14,.08],children:[e.jsx(v,{size:[.5,.12,.02],pos:[-.38,0,0],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),e.jsx(U,{font:K,position:[1.3,0,0],fontSize:.4,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:d.replace(/^0\./,".")})]},d))]}),e.jsxs("group",{ref:j,position:[0,je(i.speed),F+.15],children:[e.jsx(v,{size:[1.3,.45,.9],pos:[-1,0,.45],children:e.jsx(E,{lit:s("speed")})}),e.jsx(v,{size:[1.3,.25,.4],pos:[-1,.3,.75],children:e.jsx(E,{lit:s("speed")})})]})]}),e.jsxs("group",{userData:{part:"switch"},children:[e.jsx(v,{size:[1.7,2.5,.25],pos:[-5.6,5.6,F+.12],children:e.jsx(Y,{lit:s("switch")})}),e.jsx("group",{ref:Fe,position:[-5.6,5.6,F+.3],children:e.jsxs("mesh",{children:[e.jsx("boxGeometry",{args:[1.2,1.95,.35]}),e.jsx("meshStandardMaterial",{ref:$e,color:s("switch")?ye:"#c4161c",emissive:"#ff2a1f",emissiveIntensity:0,roughness:.25})]})}),e.jsx(U,{font:K,position:[-5.6,3.95,F+.02],fontSize:.35,color:"#3a3a3a",anchorX:"center",anchorY:"middle",children:"ON"}),e.jsx(v,{size:[2.2,1.6,.25],pos:[-5.6,2.6,F+.12],children:e.jsx(Y,{lit:s("switch")})}),e.jsxs("mesh",{position:[-5.6,2.6,F+1.4],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.32,.32,2.5,12]}),e.jsx(P,{lit:s("switch"),color:"#f4f4f2",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[-5.6,1.5,F+3],rotation:[.9,0,0],children:[e.jsx("cylinderGeometry",{args:[.3,.3,3,12]}),e.jsx(P,{lit:s("switch"),color:"#f4f4f2",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[-5.6,.32,F+7.5],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.3,.3,7,12]}),e.jsx(P,{lit:s("switch"),color:"#f4f4f2",metal:0,rough:.6})]})]}),e.jsxs("group",{userData:{part:"clutch"},position:[g.w/2+.01,13,0],rotation:[0,Math.PI/2,0],children:[e.jsxs("mesh",{position:[0,0,.02],children:[e.jsx("circleGeometry",{args:[3.3,48]}),e.jsx(P,{lit:s("clutch"),color:"#f6f5f0",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[0,0,.03],children:[e.jsx("ringGeometry",{args:[2.85,3.05,64]}),e.jsx(P,{lit:s("clutch"),color:"#d0202a",metal:0,rough:.5})]}),e.jsx(U,{font:K,position:[0,2.25,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"NEUTRALISING CLUTCH"}),e.jsx(U,{font:K,position:[-1.7,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"ENG"}),e.jsx(U,{font:K,position:[1.6,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"DIS ENG"}),e.jsx(S,{r:.55,h:.5,pos:[0,0,.25],rot:[Math.PI/2,0,0],children:e.jsx(E,{lit:s("clutch")})}),e.jsxs("group",{ref:L,position:[0,0,.55],children:[e.jsx(S,{r:.28,h:2.4,pos:[0,1.2,.2],children:e.jsx(E,{lit:s("clutch")})}),e.jsx(S,{r:.33,h:1.2,pos:[0,2.5,.75],rot:[Math.PI/2,0,0],children:e.jsx(E,{lit:s("clutch")})})]})]}),e.jsxs("group",{userData:{part:"contact"},position:[ht[0]*8.5,O,ht[1]*8.5],rotation:[0,oe,0],children:[e.jsxs("mesh",{position:[0,1.1,0],children:[e.jsx("boxGeometry",{args:[5,2.2,2.4]}),e.jsx("meshPhysicalMaterial",{color:s("contact")?ye:"#e8f3f6",transparent:!0,opacity:.45,roughness:.08,clearcoat:1,depthWrite:!1})]}),[-1,1].map(d=>e.jsxs("group",{position:[d*1.4,2.2,0],children:[e.jsx(xe,{r:.5,h:1.1,pos:[0,.55,0],lit:s("contact"),color:d<0?"#c0161c":"#1d1f22"}),e.jsx(S,{r:.18,h:.5,pos:[0,1.3,0],children:e.jsx(me,{lit:s("contact")})})]},d)),e.jsx(v,{size:[.08,1,3.8],pos:[0,1.6,-3.1],children:e.jsx(me,{lit:s("contact")})}),e.jsxs("mesh",{position:[0,1.6,-5],children:[e.jsx("sphereGeometry",{args:[.16,10,8]}),e.jsx("meshStandardMaterial",{ref:Ve,color:"#fde68a",emissive:"#fff3b0",emissiveIntensity:0})]})]}),e.jsx("group",{userData:{part:"spindle"},children:e.jsx(S,{r:2.6,h:.35,pos:[0,O+.17,0],seg:40,children:e.jsx(E,{lit:s("spindle")})})}),e.jsxs("group",{ref:z,children:[e.jsxs("group",{userData:{part:"spindle"},children:[e.jsx(S,{r:1.5,r2:1.3,h:1.2,pos:[0,O+.9,0],seg:32,children:e.jsx(E,{lit:s("spindle")})}),e.jsx(S,{r:.75,h:he-O,pos:[0,(he+O)/2,0],seg:24,children:e.jsx(E,{lit:s("spindle")})})]}),e.jsxs("group",{userData:{part:"contact"},rotation:[0,nt,0],children:[e.jsx(S,{r:1.2,h:1,pos:[0,O+2,0],children:e.jsx(Y,{lit:s("contact")})}),e.jsx(v,{size:[.6,.5,3.2],pos:[0,O+2.1,2.1],children:e.jsx(Y,{lit:s("contact")})}),e.jsxs("mesh",{position:[0,O+2.1,3.9],rotation:[Math.PI/2,0,0],children:[e.jsx("coneGeometry",{args:[.32,.9,12]}),e.jsx(Y,{lit:s("contact")})]}),e.jsx(S,{r:.25,h:.7,pos:[.85,O+2,0],rot:[0,0,Math.PI/2],children:e.jsx(E,{lit:s("contact")})})]}),e.jsxs("group",{userData:{part:"lift"},children:[e.jsx(S,{r:1,h:1.2,pos:[0,he-.2,0],children:e.jsx(E,{lit:s("lift")})}),e.jsx(xe,{r:.85,h:1.8,pos:[0,he+1.3,0],lit:s("lift")}),e.jsx(S,{r:.5,h:.5,pos:[0,he+2.45,0],children:e.jsx(E,{lit:s("lift")})})]}),e.jsxs("group",{ref:y,position:[0,Be+i.lift,0],children:[e.jsxs("group",{userData:{part:"drum"},children:[e.jsxs("mesh",{position:[0,B/2,0],children:[e.jsx("cylinderGeometry",{args:[re,re,B,96,1,!0]}),e.jsx("meshStandardMaterial",{color:s("drum")?ye:"#16171a",metalness:.3,roughness:.6,side:Rt})]}),[.15,B-.4].map(d=>e.jsxs("group",{position:[0,d,0],children:[e.jsx(v,{size:[re*2-.2,.5,.9],pos:[0,0,0],children:e.jsx(Y,{lit:s("drum")})}),e.jsx(v,{size:[.9,.5,re*2-.2],pos:[0,0,0],children:e.jsx(Y,{lit:s("drum")})}),e.jsx(S,{r:1.6,h:1,pos:[0,0,0],children:e.jsx(Y,{lit:s("drum")})})]},d)),e.jsx(S,{r:1.25,h:2,pos:[0,B+.9,0],children:e.jsx(E,{lit:s("drum")})}),e.jsx(v,{size:[.5,.5,1.6],pos:[0,B+.6,1.9],children:e.jsx(E,{lit:s("drum")})}),e.jsx(S,{r:.32,h:2.8,pos:[1.2,B+1.1,2.6],rot:[0,0,-1.1],children:e.jsx(E,{lit:s("drum")})})]}),e.jsxs("mesh",{position:[0,B/2,0],userData:{part:"paper"},children:[e.jsx("cylinderGeometry",{args:[Ge,Ge,B,128,1,!0]}),e.jsx("meshStandardMaterial",{map:p,color:s("paper")?"#9ec5ff":"#ffffff",roughness:.85,metalness:0})]})]})]}),e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(Hs,{pos:[_.x+1.5,0,_.z-1],lit:s("stand")}),e.jsx(S,{r:.55,h:44,pos:[_.x,22.6,_.z],seg:20,children:e.jsx(E,{lit:s("stand")})}),e.jsx(v,{size:[2,2,2],pos:[_.x,D.y,_.z],children:e.jsx(pe,{lit:s("stand")})}),e.jsx(xe,{r:.5,h:1,pos:[_.x,D.y,_.z-1.4],rot:[Math.PI/2,0,0],lit:s("stand"),color:"#1d1f22"}),e.jsx(S,{r:.4,h:_.x-D.x,pos:[(_.x+D.x)/2,D.y,_.z],rot:[0,0,Math.PI/2],children:e.jsx(E,{lit:s("stand")})}),e.jsx(v,{size:[2,2,2],pos:[_.x,ae-1,_.z],children:e.jsx(pe,{lit:s("stand")})}),e.jsx(xe,{r:.5,h:1,pos:[_.x,ae-1,_.z-1.4],rot:[Math.PI/2,0,0],lit:s("stand"),color:"#1d1f22"}),e.jsx(S,{r:.35,h:_.x-be,pos:[(_.x+be)/2,ae-1,_.z],rot:[0,0,Math.PI/2],children:e.jsx(E,{lit:s("stand")})}),e.jsx(v,{size:[1.2,1.2,1.8],pos:[be,ae-1,(_.z+D.z)/2],children:e.jsx(pe,{lit:s("stand")})})]}),e.jsxs("group",{ref:b,position:[D.x,D.y,D.z],children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(v,{size:[1.2,2.2,.25],pos:[.6,0,-.9],children:e.jsx(me,{lit:s("lever")})}),e.jsx(v,{size:[1.2,2.2,.25],pos:[.6,0,.9],children:e.jsx(me,{lit:s("lever")})}),e.jsx(v,{size:[1.2,.3,2.05],pos:[.6,1.1,0],children:e.jsx(me,{lit:s("lever")})}),e.jsx(S,{r:.12,h:2.2,pos:[0,0,0],rot:[Math.PI/2,0,0],children:e.jsx(E,{lit:s("lever")})})]}),e.jsxs("group",{ref:m,children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(v,{size:[fe-.3,.5,.08],pos:[-(fe-.3)/2,0,0],children:e.jsx(pe,{lit:s("lever")})}),e.jsx(v,{size:[ve+.6,.6,.12],pos:[(ve+.6)/2-.2,0,0],children:e.jsx(pe,{lit:s("lever")})}),e.jsxs("mesh",{position:[ve,-.3,0],rotation:[Math.PI/2,0,0],children:[e.jsx("torusGeometry",{args:[.22,.05,8,16]}),e.jsx(E,{lit:s("lever")})]})]}),e.jsxs("group",{userData:{part:"stylus"},position:[-fe,0,0],children:[e.jsx(v,{size:[.9,.35,.04],pos:[.3,0,0],children:e.jsx(P,{lit:s("stylus"),color:"#e8dfc8",metal:0,rough:.6})}),e.jsx(v,{size:[.06,.12,.34],pos:[0,0,-.16],rot:[0,.35,0],children:e.jsx(P,{lit:s("stylus"),color:"#e8dfc8",metal:0,rough:.6})})]})]})]}),e.jsxs("mesh",{ref:R,position:[be,rt+2,D.z],userData:{part:"muscle"},children:[e.jsx("cylinderGeometry",{args:[.03,.03,1,6]}),e.jsx("meshStandardMaterial",{color:"#f5f0e1",roughness:.9})]}),e.jsxs("group",{userData:{part:"muscle"},position:[be,ae,D.z],children:[e.jsx(S,{r:.25,h:2.2,pos:[0,-.6,0],children:e.jsx(P,{lit:s("muscle"),color:"#efe7d6",metal:0,rough:.6})}),e.jsxs("group",{ref:T,children:[e.jsxs("mesh",{position:[0,ie*.42,0],scale:[1,2.6,.9],children:[e.jsx("sphereGeometry",{args:[ie*.19,24,16]}),e.jsx(P,{lit:s("muscle"),color:"#b4485a",metal:0,rough:.55})]}),e.jsx(S,{r:.08,r2:.05,h:ie*.32,pos:[0,ie*.84,0],seg:8,children:e.jsx(P,{lit:s("muscle"),color:"#efe9df",metal:0,rough:.4})})]})]})]})},ie=4.5,ae=D.y-13,rt=ae+ie,be=D.x+ve,_={x:26,z:D.z+1.3},Hs=({pos:r,lit:t})=>{const n=f.useMemo(()=>{const o=new Ht,s=7;[Math.PI/2,Math.PI/2+2*Math.PI/3,Math.PI/2+4*Math.PI/3].forEach((u,a)=>{const h=Math.cos(u)*s,l=Math.sin(u)*s;a===0?o.moveTo(h,l):o.lineTo(h,l)}),o.closePath();const i=new Gt(o,{depth:1.3,bevelEnabled:!0,bevelSize:.5,bevelThickness:.3,bevelSegments:3});return i.rotateX(-Math.PI/2),i},[]);return e.jsx("group",{position:r,rotation:[0,.3,0],children:e.jsx("mesh",{geometry:n,position:[0,.3,0],children:e.jsx(P,{lit:t,color:"#1f2a3a",metal:.4,rough:.5})})})},Ws=r=>{const t=Ts/r;return t<60?`${t.toFixed(t<10?2:1)} s`:t<3600?`${Math.round(t/60)} min`:`${(t/3600).toFixed(1)} h`},Fs=({kymo:r})=>{const{state:t,set:n,stimulate:o,newPaper:s}=r,i=a=>`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${a?"bg-amber-500/20 border-amber-400 text-amber-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,u=Kt(t)?`one turn: ${Ws(ke[t.speed])}`:t.on?"drum not driven":"motor off";return e.jsxs("section",{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>n({on:!t.on}),className:`flex-1 ${i(t.on)}`,children:t.on?"Motor ON":"Motor OFF"}),e.jsx("button",{onClick:()=>n({clutch:!t.clutch}),className:`flex-1 ${i(t.clutch)}`,children:t.clutch?"Clutch engaged":"Clutch disengaged"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:[e.jsx("span",{children:"Speed lever (mm/s)"}),e.jsx("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:u})]}),e.jsx("div",{className:"grid grid-cols-3 gap-1.5",children:[...ke.map(String),"N"].map((a,h)=>e.jsx("button",{onClick:()=>n({speed:h}),className:i(t.speed===h),children:a==="N"?"N (neutral)":a},a))})]}),e.jsxs("label",{className:"block",children:[e.jsxs("span",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1",children:[e.jsx("span",{children:"Drum height (screw lift)"}),e.jsxs("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:[t.lift.toFixed(1)," cm"]})]}),e.jsx("input",{type:"range",min:0,max:Yt,step:.1,value:t.lift,onChange:a=>n({lift:+a.target.value}),className:"w-full accent-amber-400","aria-label":"Drum height"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:o,className:"flex-1 px-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold",children:"Stimulate"}),e.jsx("button",{onClick:()=>n({contactStim:!t.contactStim}),className:`flex-1 ${i(t.contactStim)}`,children:t.contactStim?"Contact stimulates every turn":"Stimulate from contact"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>n({leverOn:!t.leverOn}),className:`flex-1 ${i(t.leverOn)}`,children:t.leverOn?"Lever on drum":"Lever off drum"}),e.jsx("button",{onClick:s,className:"flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold",children:"Fresh smoked paper"})]})]})},$s=({id:r,kymo:t,...n})=>{switch(r){case"rbc-pipette":return e.jsx(Pt,{kind:"rbc",...n});case"wbc-pipette":return e.jsx(Pt,{kind:"wbc",...n});case"neubauer-chamber":return e.jsx(Ds,{...n});case"kymograph":return e.jsx(Gs,{kymo:t,...n})}},At={"rbc-pipette":{all:{center:[.25,-1,0],halfW:5.9,halfH:1.6,from:[.2,.3,1]}},"wbc-pipette":{all:{center:[.25,-1,0],halfW:5.7,halfH:1.6,from:[.2,.3,1]}},"neubauer-chamber":{all:{center:[0,-1,0],halfW:44,halfH:21,from:[.15,1.3,.9]},closeUp:{grid:{center:[0,-.1,7.6],halfW:1.7,halfH:1.7,from:[0,1,.3]}}},kymograph:{all:{center:[7,25,3],halfW:21,halfH:26,from:[.4,.3,1]},closeUp:{paper:{center:[0,34.5,7.5],halfW:9,halfH:8,from:[.15,.1,1]},stylus:{center:[1,34.5,7.5],halfW:4,halfH:3.5,from:[.5,.25,1]},speed:{center:[0,14,9.5],halfW:4,halfH:5.6,from:[.05,.08,1]},clutch:{center:[9.5,13,0],halfW:4,halfH:4,from:[1,.12,.1]},contact:{center:[-5.2,22.6,-5.2],halfW:6,halfH:4.5,from:[-.75,.45,-.75]}}}},Vs=({id:r,part:t})=>{var l;const n=Ue(c=>c.camera),o=Ue(c=>c.size.width/c.size.height),s=Ue(c=>c.controls),i=f.useRef(null),u=f.useRef(!1),h=(t&&((l=At[r].closeUp)==null?void 0:l[t])||null)??At[r].all;return f.useEffect(()=>{const c=Math.tan(Ot.degToRad(n.fov/2)),p=1.15*Math.max(h.halfH/c,h.halfW/(c*o)),x=new w(...h.center),z=x.clone().add(new w(...h.from).normalize().multiplyScalar(p));u.current?i.current={pos:z,target:x}:(n.position.copy(z),n.lookAt(x),s&&(s.target.copy(x),s.update(),u.current=!0))},[h,o,n,s]),kt(()=>{const c=i.current;!c||!s||(n.position.lerp(c.pos,.12),s.target.lerp(c.target,.12),s.update(),n.position.distanceTo(c.pos)<c.pos.distanceTo(c.target)*.002&&(i.current=null))}),null},Re="#CBD5E1",Xs="#2F3E46",Zs=({id:r,onBack:t,onOpen:n})=>{const o=vt(r),[s,i]=f.useState(null),[u,a]=f.useState(null),[h,l]=f.useState(Re),c=s??u,p=o.parts.find(y=>y.id===c),x=o.compareWith&&vt(o.compareWith),z=Rs();return e.jsxs("div",{className:"w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans",children:[e.jsxs("header",{className:"z-30 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 gap-4 flex-none shadow-lg",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{onClick:t,className:"p-2 bg-slate-800 rounded-full shadow-md hover:bg-slate-700 transition-colors border border-slate-700",children:e.jsx(ps,{className:"w-5 h-5 sm:w-6 sm:h-6"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-base sm:text-xl font-bold tracking-tight leading-tight",children:o.name}),e.jsx("p",{className:"text-xs text-slate-400",children:o.alsoCalled})]})]}),e.jsx("button",{onClick:()=>l(y=>y===Re?Xs:Re),className:"p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors",title:"Toggle Canvas Background",children:h===Re?e.jsx(ms,{className:"w-5 h-5"}):e.jsx(xs,{className:"w-5 h-5"})})]}),e.jsxs("main",{className:"flex-1 min-h-0 flex flex-col md:flex-row",children:[e.jsxs("div",{className:"relative h-[42%] md:h-auto md:flex-1 flex-none",children:[e.jsxs(gs,{camera:{position:[3,4,14],fov:35},style:{background:h},onPointerMissed:()=>a(null),children:[e.jsx("color",{attach:"background",args:[h]},h),e.jsx(js,{variant:"studio"}),e.jsx("ambientLight",{intensity:.6}),e.jsx("directionalLight",{position:[5,8,6],intensity:1}),e.jsx($s,{id:r,active:c,onHover:i,onSelect:a,kymo:z}),e.jsx(bs,{makeDefault:!0,enablePan:!1,zoomToCursor:!0}),e.jsx(Vs,{id:r,part:u})]}),p?e.jsxs("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-10 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-2xl shadow-lg",children:[e.jsx("div",{className:"text-blue-300 font-bold text-[11px] uppercase tracking-wider",children:p.name}),e.jsx("div",{className:"text-slate-200 text-xs leading-snug mt-0.5",children:p.note})]}):e.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-slate-900/70 rounded-full text-[11px] text-slate-300 whitespace-nowrap pointer-events-none",children:"Drag to turn · tap a part to name it"})]}),e.jsxs("aside",{className:"flex-1 md:flex-none md:w-96 min-h-0 overflow-y-auto bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-6 text-sm",children:[e.jsx("p",{className:"text-slate-300",children:o.summary}),r==="kymograph"&&e.jsx(Fs,{kymo:z}),e.jsxs("section",{children:[e.jsx("h2",{className:"text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:"Parts"}),e.jsx("div",{className:"grid grid-cols-2 gap-2",children:o.parts.map(y=>e.jsx("button",{onClick:()=>a(m=>m===y.id?null:y.id),onMouseEnter:()=>i(y.id),onMouseLeave:()=>i(null),className:`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${c===y.id?"bg-blue-600/20 border-blue-500 text-blue-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,children:y.name},y.id))})]}),e.jsxs("div",{className:"flex flex-col gap-2",children:[x&&e.jsxs("button",{onClick:()=>n(`instrument-${x.id}`),className:"w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition-colors",children:["Compare with the ",x.name]}),e.jsxs("button",{onClick:()=>n(o.experiment.view),className:"w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl border border-indigo-500/40 transition-colors",children:["Open the ",o.experiment.label," experiment"]})]})]})]})]})};export{Zs as InstrumentViewer};
