import{ax as $t,ay as us,az as It,aA as xt,aB as _e,aC as ps,aD as yt,aE as kt,V as R,aF as xs,aG as Dt,aH as Rt,t as Le,aI as fs,aJ as Ae,aK as ms,aL as js,f as gs,r as u,G as ys,a as bs,aM as ft,aN as vs,R as K,v as bt,j as e,y as Ms,H as Xt,u as ue,D as vt,m as Mt,i as Ss,aw as ws,x as Yt,w as Kt}from"./index-CXiFHb_3.js";import{T as ie,a as le,L as qt}from"./labelFonts-DYVrnf5B.js";const Zt=$t>=125?"uv1":"uv2",Tt=new yt,We=new R;class St extends us{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const s=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],r=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],o=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(o),this.setAttribute("position",new It(s,3)),this.setAttribute("uv",new It(r,2))}applyMatrix4(s){const r=this.attributes.instanceStart,o=this.attributes.instanceEnd;return r!==void 0&&(r.applyMatrix4(s),o.applyMatrix4(s),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(s){let r;s instanceof Float32Array?r=s:Array.isArray(s)&&(r=new Float32Array(s));const o=new xt(r,6,1);return this.setAttribute("instanceStart",new _e(o,3,0)),this.setAttribute("instanceEnd",new _e(o,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(s,r=3){let o;s instanceof Float32Array?o=s:Array.isArray(s)&&(o=new Float32Array(s));const t=new xt(o,r*2,1);return this.setAttribute("instanceColorStart",new _e(t,r,0)),this.setAttribute("instanceColorEnd",new _e(t,r,r)),this}fromWireframeGeometry(s){return this.setPositions(s.attributes.position.array),this}fromEdgesGeometry(s){return this.setPositions(s.attributes.position.array),this}fromMesh(s){return this.fromWireframeGeometry(new ps(s.geometry)),this}fromLineSegments(s){const r=s.geometry;return this.setPositions(r.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new yt);const s=this.attributes.instanceStart,r=this.attributes.instanceEnd;s!==void 0&&r!==void 0&&(this.boundingBox.setFromBufferAttribute(s),Tt.setFromBufferAttribute(r),this.boundingBox.union(Tt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new kt),this.boundingBox===null&&this.computeBoundingBox();const s=this.attributes.instanceStart,r=this.attributes.instanceEnd;if(s!==void 0&&r!==void 0){const o=this.boundingSphere.center;this.boundingBox.getCenter(o);let t=0;for(let l=0,a=s.count;l<a;l++)We.fromBufferAttribute(s,l),t=Math.max(t,o.distanceToSquared(We)),We.fromBufferAttribute(r,l),t=Math.max(t,o.distanceToSquared(We));this.boundingSphere.radius=Math.sqrt(t),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(s){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(s)}}class Jt extends St{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(s){const r=s.length-3,o=new Float32Array(2*r);for(let t=0;t<r;t+=3)o[2*t]=s[t],o[2*t+1]=s[t+1],o[2*t+2]=s[t+2],o[2*t+3]=s[t+3],o[2*t+4]=s[t+4],o[2*t+5]=s[t+5];return super.setPositions(o),this}setColors(s,r=3){const o=s.length-r,t=new Float32Array(2*o);if(r===3)for(let l=0;l<o;l+=r)t[2*l]=s[l],t[2*l+1]=s[l+1],t[2*l+2]=s[l+2],t[2*l+3]=s[l+3],t[2*l+4]=s[l+4],t[2*l+5]=s[l+5];else for(let l=0;l<o;l+=r)t[2*l]=s[l],t[2*l+1]=s[l+1],t[2*l+2]=s[l+2],t[2*l+3]=s[l+3],t[2*l+4]=s[l+4],t[2*l+5]=s[l+5],t[2*l+6]=s[l+6],t[2*l+7]=s[l+7];return super.setColors(t,r),this}fromLine(s){const r=s.geometry;return this.setPositions(r.attributes.position.array),this}}class wt extends xs{constructor(s){super({type:"LineMaterial",uniforms:Dt.clone(Dt.merge([Rt.common,Rt.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Le(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${$t>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(r){this.uniforms.diffuse.value=r}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(r){r===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(r){this.uniforms.linewidth.value=r}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(r){!!r!="USE_DASH"in this.defines&&(this.needsUpdate=!0),r===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(r){this.uniforms.dashScale.value=r}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(r){this.uniforms.dashSize.value=r}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(r){this.uniforms.dashOffset.value=r}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(r){this.uniforms.gapSize.value=r}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(r){this.uniforms.opacity.value=r}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(r){this.uniforms.resolution.value.copy(r)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(r){!!r!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),r===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(s)}}const lt=new Ae,Ct=new R,Ot=new R,U=new Ae,B=new Ae,te=new Ae,ct=new R,dt=new js,N=new ms,Gt=new R,Ve=new yt,$e=new kt,se=new Ae;let oe,ge;function Ut(n,s,r){return se.set(0,0,-s,1).applyMatrix4(n.projectionMatrix),se.multiplyScalar(1/se.w),se.x=ge/r.width,se.y=ge/r.height,se.applyMatrix4(n.projectionMatrixInverse),se.multiplyScalar(1/se.w),Math.abs(Math.max(se.x,se.y))}function zs(n,s){const r=n.matrixWorld,o=n.geometry,t=o.attributes.instanceStart,l=o.attributes.instanceEnd,a=Math.min(o.instanceCount,t.count);for(let c=0,h=a;c<h;c++){N.start.fromBufferAttribute(t,c),N.end.fromBufferAttribute(l,c),N.applyMatrix4(r);const x=new R,y=new R;oe.distanceSqToSegment(N.start,N.end,y,x),y.distanceTo(x)<ge*.5&&s.push({point:y,pointOnLine:x,distance:oe.origin.distanceTo(y),object:n,face:null,faceIndex:c,uv:null,[Zt]:null})}}function Es(n,s,r){const o=s.projectionMatrix,l=n.material.resolution,a=n.matrixWorld,c=n.geometry,h=c.attributes.instanceStart,x=c.attributes.instanceEnd,y=Math.min(c.instanceCount,h.count),S=-s.near;oe.at(1,te),te.w=1,te.applyMatrix4(s.matrixWorldInverse),te.applyMatrix4(o),te.multiplyScalar(1/te.w),te.x*=l.x/2,te.y*=l.y/2,te.z=0,ct.copy(te),dt.multiplyMatrices(s.matrixWorldInverse,a);for(let _=0,i=y;_<i;_++){if(U.fromBufferAttribute(h,_),B.fromBufferAttribute(x,_),U.w=1,B.w=1,U.applyMatrix4(dt),B.applyMatrix4(dt),U.z>S&&B.z>S)continue;if(U.z>S){const w=U.z-B.z,T=(U.z-S)/w;U.lerp(B,T)}else if(B.z>S){const w=B.z-U.z,T=(B.z-S)/w;B.lerp(U,T)}U.applyMatrix4(o),B.applyMatrix4(o),U.multiplyScalar(1/U.w),B.multiplyScalar(1/B.w),U.x*=l.x/2,U.y*=l.y/2,B.x*=l.x/2,B.y*=l.y/2,N.start.copy(U),N.start.z=0,N.end.copy(B),N.end.z=0;const F=N.closestPointToPointParameter(ct,!0);N.at(F,Gt);const Q=gs.lerp(U.z,B.z,F),Y=Q>=-1&&Q<=1,pe=ct.distanceTo(Gt)<ge*.5;if(Y&&pe){N.start.fromBufferAttribute(h,_),N.end.fromBufferAttribute(x,_),N.start.applyMatrix4(a),N.end.applyMatrix4(a);const w=new R,T=new R;oe.distanceSqToSegment(N.start,N.end,T,w),r.push({point:T,pointOnLine:w,distance:oe.origin.distanceTo(T),object:n,face:null,faceIndex:_,uv:null,[Zt]:null})}}}class Qt extends fs{constructor(s=new St,r=new wt({color:Math.random()*16777215})){super(s,r),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const s=this.geometry,r=s.attributes.instanceStart,o=s.attributes.instanceEnd,t=new Float32Array(2*r.count);for(let a=0,c=0,h=r.count;a<h;a++,c+=2)Ct.fromBufferAttribute(r,a),Ot.fromBufferAttribute(o,a),t[c]=c===0?0:t[c-1],t[c+1]=t[c]+Ct.distanceTo(Ot);const l=new xt(t,2,1);return s.setAttribute("instanceDistanceStart",new _e(l,1,0)),s.setAttribute("instanceDistanceEnd",new _e(l,1,1)),this}raycast(s,r){const o=this.material.worldUnits,t=s.camera;t===null&&!o&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const l=s.params.Line2!==void 0&&s.params.Line2.threshold||0;oe=s.ray;const a=this.matrixWorld,c=this.geometry,h=this.material;ge=h.linewidth+l,c.boundingSphere===null&&c.computeBoundingSphere(),$e.copy(c.boundingSphere).applyMatrix4(a);let x;if(o)x=ge*.5;else{const S=Math.max(t.near,$e.distanceToPoint(oe.origin));x=Ut(t,S,h.resolution)}if($e.radius+=x,oe.intersectsSphere($e)===!1)return;c.boundingBox===null&&c.computeBoundingBox(),Ve.copy(c.boundingBox).applyMatrix4(a);let y;if(o)y=ge*.5;else{const S=Math.max(t.near,Ve.distanceToPoint(oe.origin));y=Ut(t,S,h.resolution)}Ve.expandByScalar(y),oe.intersectsBox(Ve)!==!1&&(o?zs(this,r):Es(this,t,r))}onBeforeRender(s){const r=this.material.uniforms;r&&r.resolution&&(s.getViewport(lt),this.material.uniforms.resolution.value.set(lt.z,lt.w))}}class _s extends Qt{constructor(s=new Jt,r=new wt({color:Math.random()*16777215})){super(s,r),this.isLine2=!0,this.type="Line2"}}const Ps=u.forwardRef(function({points:s,color:r=16777215,vertexColors:o,linewidth:t,lineWidth:l,segments:a,dashed:c,...h},x){var y,S;const _=ys(Y=>Y.size),i=u.useMemo(()=>a?new Qt:new _s,[a]),[p]=u.useState(()=>new wt),F=(o==null||(y=o[0])==null?void 0:y.length)===4?4:3,Q=u.useMemo(()=>{const Y=a?new St:new Jt,pe=s.map(w=>{const T=Array.isArray(w);return w instanceof R||w instanceof Ae?[w.x,w.y,w.z]:w instanceof Le?[w.x,w.y,0]:T&&w.length===3?[w[0],w[1],w[2]]:T&&w.length===2?[w[0],w[1],0]:w});if(Y.setPositions(pe.flat()),o){r=16777215;const w=o.map(T=>T instanceof bs?T.toArray():T);Y.setColors(w.flat(),F)}return Y},[s,a,o,F]);return u.useLayoutEffect(()=>{i.computeLineDistances()},[s,i]),u.useLayoutEffect(()=>{c?p.defines.USE_DASH="":delete p.defines.USE_DASH,p.needsUpdate=!0},[c,p]),u.useEffect(()=>()=>{Q.dispose(),p.dispose()},[Q]),u.createElement("primitive",ft({object:i,ref:x},h),u.createElement("primitive",{object:Q,attach:"geometry"}),u.createElement("primitive",ft({object:p,attach:"material",color:r,vertexColors:!!o,resolution:[_.width,_.height],linewidth:(S=t??l)!==null&&S!==void 0?S:1,dashed:c,transparent:F===4},h)))}),Bt=u.forwardRef(({threshold:n=15,geometry:s,...r},o)=>{const t=u.useRef(null);u.useImperativeHandle(o,()=>t.current,[]);const l=u.useMemo(()=>[0,0,0,1,0,0],[]),a=u.useRef(),c=u.useRef();return u.useLayoutEffect(()=>{const h=t.current.parent,x=s??(h==null?void 0:h.geometry);if(!x||a.current===x&&c.current===n)return;a.current=x,c.current=n;const S=new vs(x,n).attributes.position.array;t.current.geometry.setPositions(S),t.current.geometry.attributes.instanceStart.needsUpdate=!0,t.current.geometry.attributes.instanceEnd.needsUpdate=!0,t.current.computeLineDistances()}),u.createElement(Ps,ft({segments:!0,points:l,ref:t,raycast:()=>null},r))}),O="#3b82f6",he=n=>n?{emissive:O,emissiveIntensity:.55}:{},f=({lit:n})=>e.jsx("meshStandardMaterial",{color:n?O:"#c9ced3",metalness:.9,roughness:.28,...he(n)}),q=({lit:n})=>e.jsx("meshStandardMaterial",{color:n?O:"#b8923a",metalness:.85,roughness:.35,...he(n)}),k=({lit:n,color:s="#f4f5f6"})=>e.jsx("meshStandardMaterial",{color:n?O:s,roughness:.55,...he(n)}),$=({lit:n})=>e.jsx("meshStandardMaterial",{color:n?O:"#a8405f",roughness:.8,...he(n)}),ae=({lit:n})=>e.jsx("meshStandardMaterial",{color:n?O:"#1c1d20",roughness:.6,...he(n)}),E=({lit:n,opacity:s=.3})=>e.jsx("meshPhysicalMaterial",{color:n?O:"#eef6fa",transparent:!0,opacity:n?.6:s,roughness:.05,clearcoat:1,envMapIntensity:1.5,depthWrite:!1,side:Xt,...he(n)}),v=({a:n,b:s,r,children:o,seg:t=14})=>{const{pos:l,quat:a,len:c}=u.useMemo(()=>{const h=new R(...n),x=new R(...s),y=x.clone().sub(h);return{pos:h.clone().add(x).multiplyScalar(.5),quat:new Ms().setFromUnitVectors(new R(0,1,0),y.clone().normalize()),len:y.length()}},[n,s]);return e.jsxs("mesh",{position:l,quaternion:a,children:[e.jsx("cylinderGeometry",{args:[r,r,c,t,1]}),o]})},L=({pts:n,r:s,children:r,seg:o=48})=>{const t=u.useMemo(()=>new vt(new Mt(n.map(l=>new R(...l)),!1,"catmullrom",.5),o,s,10,!1),[n,s,o]);return e.jsx("mesh",{geometry:t,children:r})},j=({at:n,size:s,children:r,rot:o})=>e.jsxs("mesh",{position:n,rotation:o,children:[e.jsx("boxGeometry",{args:s}),r]}),X=({at:n,size:s,children:r,color:o="#111827",bold:t,rot:l})=>e.jsx(ie,{font:t?le:qt,position:n,rotation:l,fontSize:s,color:o,anchorX:"center",anchorY:"middle",children:r}),Ls=n=>{for(let s=n;s;s=s.parent)if(s.userData.part)return s.userData;return null},Nt=n=>{var r;const s=n.intersections.map(o=>Ls(o.object)).filter(o=>!!o);return((r=s.find(o=>!o.glass)??s[0])==null?void 0:r.part)??null},g={x:11,z:9,y0:38,y1:60},As=11,A=-4,re=1.8,ce=5,de=1,m=[-1,23.5,7],b=7,Me=-5.6,fe=25.8,ht=[m[0]+.45,16.9,b],sr=m,rr=20.1,mt=16.8,Pe=[22.8,20.95,b],Is=[4,-.35],es=(n,s)=>{const r=Math.cos(-s),o=Math.sin(-s);return[Pe[0]+n[0]*r-n[1]*o,Pe[1]+n[0]*o+n[1]*r]},nr=39,ir=n=>es([16.2,.7],n)[1],Ue=21,Ft="#bfe3f5",ke=({ends:n,color:s,drawn:r})=>{const o=u.useRef(null),t=u.useMemo(()=>new R(0,1,0),[]);return ue(()=>{const l=o.current;if(!l)return;const[a,c]=n(),h=r?Math.max(0,Math.min(1,r())):1;l.visible=h>.01;const x=new R(...a),y=x.clone().lerp(new R(...c),h),S=y.clone().sub(x);l.position.copy(x.add(y).multiplyScalar(.5)),l.quaternion.setFromUnitVectors(t,S.clone().normalize()),l.scale.set(1,S.length(),1)}),e.jsxs("mesh",{ref:o,children:[e.jsx("cylinderGeometry",{args:[.035,.035,1,5,1]}),e.jsx("meshBasicMaterial",{color:s})]})},Ds=[[-23,15.5,7.4],[-22.6,14.4,7.4],[-21.2,14,7.4],[-19.8,14.4,7.4],[-19.4,15.5,7.4]],jt=()=>e.jsx("meshStandardMaterial",{color:"#9aa1a8",metalness:1,roughness:.15}),Rs=({motion:n})=>{const s=u.useRef(null),r=u.useRef(null),o=u.useRef(null);return ue(()=>{const t=((n==null?void 0:n.current.hg)??0)/20,l=Ue+t,a=Math.max(15.55,Ue-t);s.current&&(s.current.scale.y=l-15.5,s.current.position.y=(l+15.5)/2),r.current&&(r.current.scale.y=a-15.5,r.current.position.y=(a+15.5)/2),o.current&&(o.current.position.y=l,o.current.visible=!!n&&t>.05)}),e.jsxs(e.Fragment,{children:[e.jsxs("mesh",{ref:s,position:[-23,18,7.4],children:[e.jsx("cylinderGeometry",{args:[.2,.2,1,12]}),e.jsx(jt,{})]}),e.jsxs("mesh",{ref:r,position:[-19.4,18,7.4],children:[e.jsx("cylinderGeometry",{args:[.2,.2,1,12]}),e.jsx(jt,{})]}),e.jsx("group",{ref:o,position:[-22.6,Ue,7.05],visible:!1,children:e.jsxs("mesh",{rotation:[0,0,-Math.PI/2],children:[e.jsx("coneGeometry",{args:[.22,.5,3]}),e.jsx("meshBasicMaterial",{color:"#dc2626"})]})})]})},Ts=[[0,37.8,3],[0,33,3.6],[-.7,29,6.2],[-1,27,7]],Cs=({motion:n})=>{const s=u.useMemo(()=>new Mt(Ts.map(c=>new R(...c)),!1,"catmullrom",.5),[]),r=u.useMemo(()=>new vt(s,60,.53,10,!1),[s]),o=u.useRef(null),t=u.useRef(null),l=u.useRef(null),a=u.useRef(null);return ue(()=>{const c=performance.now()/1e3,h=n.current.perfuse,x=Math.max(0,Math.min(1,h/.7)),y=Math.max(0,Math.min(1,(h-.7)/.3)),S=r.index?r.index.count:0;r.setDrawRange(0,Math.floor(S*x/6)*6),o.current&&(o.current.visible=x>.01),t.current&&(t.current.visible=y>.01,t.current.scale.set(y,1.15*y,y)),l.current&&(l.current.visible=y>.95),a.current&&(a.current.visible=h>.01&&h<.99,a.current.children.forEach((_,i)=>{const p=(c*.9+i/4)%1*Math.max(x,.02);Number.isFinite(p)&&_.position.copy(s.getPointAt(Math.max(0,Math.min(1,p))))}))}),e.jsxs("group",{children:[e.jsx("mesh",{ref:o,geometry:r,visible:!1,children:e.jsx("meshStandardMaterial",{color:"#7dd3fc",transparent:!0,opacity:.8,roughness:.25})}),e.jsx("group",{ref:a,visible:!1,children:[0,1,2,3].map(c=>e.jsxs("mesh",{children:[e.jsx("sphereGeometry",{args:[.6,12,10]}),e.jsx("meshStandardMaterial",{color:"#e0f2fe",emissive:"#38bdf8",emissiveIntensity:.6,transparent:!0,opacity:.9})]},c))}),e.jsxs("mesh",{ref:t,position:m,visible:!1,children:[e.jsx("sphereGeometry",{args:[1.2,22,16]}),e.jsx("meshStandardMaterial",{color:"#7dd3fc",transparent:!0,opacity:.6,depthWrite:!1})]}),e.jsxs("mesh",{ref:l,position:[m[0],21.25,m[2]],visible:!1,children:[e.jsx("cylinderGeometry",{args:[.4,.12,2,12]}),e.jsx("meshStandardMaterial",{color:"#7dd3fc",transparent:!0,opacity:.6,depthWrite:!1})]})]})},Ht=({motion:n,at:s,children:r})=>{const o=u.useRef(null);return ue(()=>{const t=o.current;if(!t)return;const l=n.current.fill;t.visible=l>.01,t.scale.set(1,Math.max(.01,l),1)}),e.jsx("group",{ref:o,position:s,children:r})},Os=({x:n})=>{const s=u.useRef(null),r=u.useMemo(()=>Array.from({length:7},(o,t)=>({off:t/7,wob:Math.random()*6})),[]);return ue(({clock:o})=>{const t=s.current;t&&t.children.forEach((l,a)=>{const c=r[a],h=(o.elapsedTime*.55+c.off)%1;l.position.set(n+Math.sin(h*9+c.wob)*.25,97.4+h*6.2,A+Math.cos(h*7+c.wob)*.2),l.scale.setScalar(.6+h*.6)})}),e.jsx("group",{ref:s,children:r.map((o,t)=>e.jsxs("mesh",{children:[e.jsx("sphereGeometry",{args:[.2,8,6]}),e.jsx("meshStandardMaterial",{color:"#ffffff",transparent:!0,opacity:.7,roughness:.1})]},t))})},Gs=({motion:n,lit:s})=>{const r=u.useRef(null);return ue(()=>{r.current&&(r.current.position.y=mt+n.current.lift+.15,r.current.visible=n.current.thread>.001)}),e.jsxs("group",{ref:r,position:[m[0]+.05,mt,b],children:[e.jsx(v,{a:[-.18,0,0],b:[-.18,-1.75,0],r:.05,seg:6,children:e.jsx(f,{lit:s})}),e.jsx(v,{a:[.2,-.15,0],b:[.2,-1.75,0],r:.05,seg:6,children:e.jsx(f,{lit:s})}),e.jsx(j,{at:[.01,-.1,0],size:[.55,.3,.14],children:e.jsx(f,{lit:s})}),e.jsxs("mesh",{position:[.01,-1.95,0],children:[e.jsx("torusGeometry",{args:[.24,.05,6,16]}),e.jsx(f,{lit:s})]})]})},Us=({motion:n,children:s})=>{const r=u.useRef(null);return ue(()=>{r.current&&n&&(r.current.rotation.z=-n.current.tilt)}),e.jsx("group",{ref:r,position:Pe,children:e.jsx("group",{position:[-Pe[0],-Pe[1],-Pe[2]],children:s})})},Bs=(()=>{let n=null;return()=>n??(n=new bt([[0,0],[4.8,0],[5,.4],[5,10.5],[4.4,12.2],[2.2,14.2],[1.8,14.8],[1.8,16.6],[2.3,17],[2.3,17.4],[1.7,17.4]].map(([s,r])=>new Le(s,r)),40))})(),Ns=(()=>{const n=[];for(let s=0;s<=140;s++){const r=s/140,o=r*Math.PI*2*7;n.push([-2.6+r*5.2,45.5+Math.sin(o)*1.8,-4+Math.cos(o)*1.8])}return n})(),or=K.memo(({active:n,onHover:s,onSelect:r,live:o})=>{const t=i=>n===i,l=u.useMemo(Bs,[]),a=u.useMemo(()=>new bt([[0,.45],[4.75,.45],[4.75,9.2],[0,9.2]].map(([i,p])=>new Le(i,p)),36),[]),c=[-1,1],h=o==null?void 0:o.motion,x=t("pulleys")?O:"#f8fafc",y=()=>(h==null?void 0:h.current.thread)??1,S=()=>o!=null&&o.heart&&h?[m[0]+.06,mt+h.current.lift+.15-2.19,b]:ht,_=()=>{const[i,p]=es(Is,(h==null?void 0:h.current.tilt)??0);return[i,p,b]};return e.jsxs("group",{onPointerMove:i=>{i.stopPropagation(),s(Nt(i))},onPointerOut:()=>s(null),onClick:i=>{i.stopPropagation();const p=Nt(i);p&&r(p)},children:[e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(j,{at:[0,-1,2],size:[46,2,32],children:e.jsx(k,{lit:t("stand")})}),c.map(i=>e.jsxs(K.Fragment,{children:[e.jsx(v,{a:[i*17,0,A],b:[i*17,112,A],r:.6,children:e.jsx(f,{lit:t("stand")})}),e.jsxs("mesh",{position:[i*17,2.2,A],children:[e.jsx("cylinderGeometry",{args:[1.1,1.8,4.4,20]}),e.jsx(k,{lit:t("stand")})]}),e.jsx(v,{a:[i*17,0,6],b:[i*17,i<0?35:30,6],r:.55,children:e.jsx(f,{lit:t("stand")})}),e.jsxs("mesh",{position:[i*17,2.2,6],children:[e.jsx("cylinderGeometry",{args:[1.1,1.8,4.4,20]}),e.jsx(k,{lit:t("stand")})]})]},i)),c.map(i=>c.map(p=>e.jsxs(K.Fragment,{children:[e.jsx(v,{a:[i*g.x,0,p*g.z],b:[i*g.x,27,p*g.z],r:.7,children:e.jsx(f,{lit:t("stand")})}),e.jsx(j,{at:[i*(g.x+.6),44.5,p*(g.z+.6)],size:[2,35,2],children:e.jsx(k,{lit:t("stand")})})]},`${i}${p}`))),c.map(i=>e.jsxs(K.Fragment,{children:[e.jsx(j,{at:[0,37.3,i*(g.z+.6)],size:[2*g.x+1.2,1.4,2],children:e.jsx(k,{lit:t("stand")})}),e.jsx(j,{at:[i*(g.x+.6),37.3,0],size:[2,1.4,2*g.z+1.2],children:e.jsx(k,{lit:t("stand")})}),e.jsx(j,{at:[0,61,i*(g.z+.9)],size:[2*g.x+3.4,2,.9],children:e.jsx(f,{lit:t("stand")})}),e.jsx(j,{at:[i*(g.x+1.25),61,0],size:[.9,2,2*g.z+1.8],children:e.jsx(f,{lit:t("stand")})})]},i)),e.jsx(j,{at:[0,61,g.z+1.4],size:[13,1.5,.08],children:e.jsx("meshBasicMaterial",{color:"#ffffff"})}),e.jsx(X,{at:[0,61,g.z+1.46],size:.82,bold:!0,children:"LANGENDORFF APPARATUS"}),e.jsx(v,{a:[-18.5,23.4,6],b:[18.5,23.4,6],r:.45,children:e.jsx(f,{lit:t("stand")})}),e.jsx(v,{a:[-23,13,6],b:[Me+1,13,6],r:.45,children:e.jsx(f,{lit:t("stand")})}),e.jsx(v,{a:[6.5,13,6],b:[fe+.9,13,6],r:.45,children:e.jsx(f,{lit:t("stand")})}),[[-17,23.4],[17,23.4],[-17,13],[17,13]].map(([i,p])=>e.jsx(j,{at:[i,p,6],size:[1.9,1.9,1.9],children:e.jsx(f,{lit:t("stand")})},`${i}${p}`))]}),e.jsx("group",{userData:{part:"reservoirs"},children:c.map(i=>e.jsxs("group",{position:[i*As,102,A],children:[e.jsxs("group",{userData:{part:"reservoirs",glass:!0},children:[e.jsx("mesh",{geometry:l,children:e.jsx(E,{lit:t("reservoirs"),opacity:.28})}),h&&e.jsx(Ht,{motion:h,at:[0,0,0],children:e.jsx("mesh",{geometry:a,children:e.jsx("meshStandardMaterial",{color:Ft,transparent:!0,opacity:.55,roughness:.2,depthWrite:!1})})}),e.jsx(v,{a:[-i*4.8,1.7,0],b:[-i*6.6,1.7,0],r:1.05,children:e.jsx(E,{lit:t("reservoirs")})})]}),e.jsxs("mesh",{position:[-i*6.9,1.7,0],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.95,.75,1.5,18]}),e.jsx("meshStandardMaterial",{color:t("reservoirs")?O:"#c0392b",roughness:.7})]}),e.jsxs("mesh",{position:[0,-.3,0],children:[e.jsx("cylinderGeometry",{args:[5.7,5.7,.4,36]}),e.jsx(k,{lit:t("reservoirs")})]}),e.jsx(j,{at:[i*5.6,-.3,0],size:[2.4,1.4,2.2],children:e.jsx(k,{lit:t("reservoirs")})}),[0,1,2].map(p=>{const F=p===0?Math.PI/2:p===1?-Math.PI/2:i>0?0:Math.PI;return e.jsx(j,{at:[Math.cos(F)*5.25,6,Math.sin(F)*5.25],size:[.25,12.5,1.6],rot:[0,-F,0],children:e.jsx(k,{lit:t("reservoirs")})},p)})]},i))}),e.jsx("group",{userData:{part:"head-tubes"},children:c.map(i=>e.jsxs(K.Fragment,{children:[e.jsxs("group",{userData:{part:"head-tubes",glass:!0},children:[e.jsxs("mesh",{position:[i*re,102,A],children:[e.jsx("cylinderGeometry",{args:[.9,.9,22,20,1,!0]}),e.jsx(E,{lit:t("head-tubes")})]}),e.jsxs("mesh",{position:[i*re,90.2,A],children:[e.jsx("cylinderGeometry",{args:[.9,.35,1.6,20,1,!0]}),e.jsx(E,{lit:t("head-tubes")})]}),e.jsx(v,{a:[i*re,86.5,A],b:[i*re,89.4,A],r:.35,children:e.jsx(E,{lit:t("head-tubes")})}),e.jsx(v,{a:[i*(re+.8),103.7,A],b:[i*4.4,103.7,A],r:.3,children:e.jsx(E,{lit:t("head-tubes")})}),e.jsx(v,{a:[i*re,97,A],b:[-i*1.6,121-(i>0?2:0),A+i*.6],r:.22,children:e.jsx(E,{lit:t("head-tubes"),opacity:.45})}),h&&e.jsx(Ht,{motion:h,at:[i*re,90.2,A],children:e.jsxs("mesh",{position:[0,6.8,0],children:[e.jsx("cylinderGeometry",{args:[.8,.8,13.6,16]}),e.jsx("meshStandardMaterial",{color:Ft,transparent:!0,opacity:.5,depthWrite:!1})]})})]}),(o==null?void 0:o.oxygen)&&e.jsx(Os,{x:i*re}),e.jsx(v,{a:[i*6.5,93,A],b:[i*6.5,101.5,A],r:.35,children:e.jsx(f,{lit:t("head-tubes")})}),e.jsx(v,{a:[i*7.6,95.5,A],b:[i*3.6,95.5,A],r:.3,children:e.jsx(f,{lit:t("head-tubes")})}),e.jsx(j,{at:[i*2.3,95.5,A],size:[2.6,1.3,.25],children:e.jsx(f,{lit:t("head-tubes")})}),e.jsx(j,{at:[i*6.5,95.5,A],size:[.9,.9,.9],children:e.jsx(q,{lit:t("head-tubes")})})]},i))}),e.jsxs("group",{userData:{part:"y-piece"},children:[e.jsxs("group",{userData:{part:"y-piece",glass:!0},children:[e.jsx(v,{a:[1.5,73.5,-1],b:[1.5,77,-1],r:.38,children:e.jsx(E,{lit:t("y-piece"),opacity:.4})}),e.jsx(v,{a:[1.5,77,-1],b:[.1,81,-1.4],r:.36,children:e.jsx(E,{lit:t("y-piece"),opacity:.4})}),e.jsx(v,{a:[1.5,77,-1],b:[2.9,81,-1.4],r:.36,children:e.jsx(E,{lit:t("y-piece"),opacity:.4})})]}),e.jsx(L,{pts:[[-re,87.2,A],[-1.9,84.5,-3],[.1,80.4,-1.4]],r:.5,children:e.jsx($,{lit:t("y-piece")})}),e.jsx(L,{pts:[[re,87.2,A],[2.6,84.5,-3],[2.9,80.4,-1.4]],r:.5,children:e.jsx($,{lit:t("y-piece")})}),e.jsx(L,{pts:[[1.5,74.2,-1],[2.2,69,-.6],[4.6,62,1.2],[5.7,56,1.5],[5.6,46,1.4]],r:.5,children:e.jsx($,{lit:t("y-piece")})})]}),e.jsxs("group",{userData:{part:"bath",glass:!0},children:[c.map(i=>e.jsxs(K.Fragment,{children:[e.jsxs(j,{at:[0,(g.y0+g.y1)/2,i*g.z],size:[2*g.x,g.y1-g.y0,.4],children:[e.jsx(E,{lit:t("bath"),opacity:.14}),e.jsx(Bt,{color:t("bath")?O:"#9fb0c2"})]}),e.jsxs(j,{at:[i*g.x,(g.y0+g.y1)/2,0],size:[.4,g.y1-g.y0,2*g.z],children:[e.jsx(E,{lit:t("bath"),opacity:.14}),e.jsx(Bt,{color:t("bath")?O:"#9fb0c2"})]})]},i)),e.jsx(j,{at:[0,g.y0+.2,0],size:[2*g.x,.4,2*g.z],children:e.jsx(E,{lit:t("bath"),opacity:.22})})]}),e.jsxs("group",{userData:{part:"inner-tubes"},children:[c.map(i=>e.jsxs(K.Fragment,{children:[e.jsxs("group",{userData:{part:"inner-tubes",glass:!0},children:[e.jsxs("mesh",{position:[i*ce,48.5,de],children:[e.jsx("cylinderGeometry",{args:[1.7,1.7,13,22,1,!0]}),e.jsx(E,{lit:t("inner-tubes"),opacity:.35})]}),e.jsxs("mesh",{position:[i*ce,41.3,de],children:[e.jsx("cylinderGeometry",{args:[1.7,.45,1.4,22,1,!0]}),e.jsx(E,{lit:t("inner-tubes"),opacity:.35})]}),e.jsx(v,{a:[i*ce,39.4,de],b:[i*ce,40.7,de],r:.45,children:e.jsx(E,{lit:t("inner-tubes")})}),e.jsx(L,{pts:[[i*10.5,66.5,.4],[i*6,66.5,.4],[i*4.5,65.6,.5],[i*4.3,62,.6],[i*4.3,44,.6]],r:.33,children:e.jsx(E,{lit:t("inner-tubes"),opacity:.45})})]}),e.jsxs("mesh",{position:[i*ce,39,de],children:[e.jsx("cylinderGeometry",{args:[.9,1.15,1.2,18]}),e.jsx($,{lit:t("inner-tubes")})]}),e.jsx(j,{at:[i*(g.x+1.25),62.6,.4],size:[1.4,1.2,1.4],children:e.jsx(f,{lit:t("inner-tubes")})}),e.jsx(v,{a:[i*(g.x+1.25),63,.4],b:[i*(g.x+1.25),69,.4],r:.45,children:e.jsx(f,{lit:t("inner-tubes")})}),e.jsx(j,{at:[i*10.4,66.5,.4],size:[2.6,1.1,.3],children:e.jsx(f,{lit:t("inner-tubes")})})]},i)),e.jsx(L,{pts:[[-ce,38.4,de],[-3,37,-1],[6.5,36.6,-2.6],[8.2,30,-3.6],[8.6,10,-4.4],[10,1.6,-6],[14.5,.55,-7.5]],r:.48,seg:80,children:e.jsx($,{lit:t("inner-tubes")})}),e.jsx(L,{pts:[[ce,38.4,de],[7.5,36.8,-1.2],[9.6,30,-2.8],[10.2,10,-3.6],[11.8,1.6,-4.8],[16.5,.55,-5.4]],r:.48,seg:80,children:e.jsx($,{lit:t("inner-tubes")})}),[[14.5,-7.5],[16.5,-5.4]].map(([i,p])=>e.jsx(L,{pts:[[i,.6,p],[i+.9,.9,p],[i+1.5,.6,p+.25],[i+1.1,.35,p+.5],[i+.4,.6,p+.35],[i+1.8,.6,p-.1]],r:.06,seg:30,children:e.jsx(f,{lit:t("inner-tubes")})},i))]}),e.jsxs("group",{userData:{part:"coil"},children:[e.jsx("group",{userData:{part:"coil",glass:!0},children:e.jsx(L,{pts:Ns,r:.33,seg:420,children:e.jsx(E,{lit:t("coil"),opacity:.5})})}),e.jsx(L,{pts:[[ce-.7,40.3,de-.4],[4.2,40.6,-1.5],[3.3,43,-3.2],[2.6,45.5,-2.2]],r:.42,children:e.jsx($,{lit:t("coil")})}),e.jsx(L,{pts:[[-2.6,45.5,-2.2],[-3,42,-2.4],[-1.6,39.8,.6],[0,38.6,3]],r:.42,children:e.jsx($,{lit:t("coil")})}),e.jsxs("mesh",{position:[0,38.3,3],children:[e.jsx("cylinderGeometry",{args:[.85,1,1,18]}),e.jsx($,{lit:t("coil")})]})]}),e.jsxs("group",{userData:{part:"heater"},children:[e.jsx(L,{pts:[[2.2,43.2,9.4],[2.2,43.2,2.2],[2.5,43.2,1.2],[3.3,43.2,.8],[4.1,43.2,1.2],[4.4,43.2,2.2],[4.4,43.2,9.4]],r:.42,children:e.jsx(f,{lit:t("heater")})}),e.jsxs("mesh",{position:[3.3,43.2,11.2],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[2,2.1,3.6,24]}),e.jsx(ae,{lit:t("heater")})]}),e.jsx(L,{pts:[[3.3,43.2,13],[4,41.5,14.5],[6.5,37.5,14.2],[8,36.2,13]],r:.3,children:e.jsx(ae,{lit:t("heater")})})]}),e.jsxs("group",{userData:{part:"stirrer"},children:[e.jsx(j,{at:[-9,49,-2.5],size:[2.8,4.2,3.4],children:e.jsx(ae,{lit:t("stirrer")})}),e.jsx(v,{a:[-7.6,47.6,-2.5],b:[-6.2,47.6,-2.5],r:.45,children:e.jsx(ae,{lit:t("stirrer")})}),e.jsx(L,{pts:[[-9,51,-2.5],[-10.4,58,-3],[-12.2,62.6,-1],[-13.2,58,4],[-13,44,8.5],[-9,34,9.2],[-5,31.5,10]],r:.28,children:e.jsx(ae,{lit:t("stirrer")})})]}),e.jsxs("group",{userData:{part:"probe"},children:[e.jsx(v,{a:[-9.6,43.5,4],b:[-9.6,62.5,4],r:.28,children:e.jsx(f,{lit:t("probe")})}),e.jsx(j,{at:[-9.6,50.5,4],size:[2.6,.5,1.4],children:e.jsx("meshStandardMaterial",{color:t("probe")?O:"#d9dde2",transparent:!0,opacity:.7})}),e.jsx(L,{pts:[[-9.6,62.5,4],[-11.6,63.4,5],[-13.4,56,7],[-12.6,42,9.4],[-8,32,9.6],[-5,29.5,10]],r:.24,children:e.jsx("meshStandardMaterial",{color:t("probe")?O:"#6b7280",roughness:.7})})]}),e.jsxs("group",{userData:{part:"control"},position:[3,31,12],children:[e.jsx(j,{at:[0,0,0],size:[16,10.5,8],children:e.jsx(k,{lit:t("control")})}),e.jsx(j,{at:[0,0,4.03],size:[15.4,9.9,.06],children:e.jsx("meshStandardMaterial",{color:t("control")?O:"#a9aeb4",roughness:.5,metalness:.3})}),[-5.2,5.2].map(i=>e.jsxs(K.Fragment,{children:[e.jsxs("mesh",{position:[i*.75,3.6,4.3],children:[e.jsx("sphereGeometry",{args:[.62,18,12]}),e.jsx("meshStandardMaterial",{color:"#d92626",emissive:o&&!o.heaterOn?"#2a0606":"#7a0c0c",emissiveIntensity:o?o.heaterOn?1.4:.2:.6,roughness:.3})]}),e.jsx(j,{at:[i,-.4,4.25],size:[2.6,4.6,.4],children:e.jsx(k,{lit:!1,color:"#fafafa"})}),e.jsx(j,{at:[i,-.4,4.5],size:[1.5,2.8,.25],rot:[o&&!o.heaterOn?-.12:.12,0,0],children:e.jsx(k,{lit:!1,color:"#ffffff"})}),e.jsx(X,{at:[i,-3.5,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"ON"})]},i)),e.jsx(X,{at:[-5.2,2.5,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"MAIN"}),e.jsx(X,{at:[5.2,2.8,4.1],size:.46,color:"#9b1c1c",bold:!0,children:`HEATER
STIRRER`}),e.jsx(X,{at:[0,3.1,4.1],size:.62,color:"#9b1c1c",bold:!0,children:"TWO UNIT BATH"}),e.jsx(X,{at:[0,-3.9,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"DIGITAL PID CONTROL"}),e.jsx(j,{at:[0,-.4,4.3],size:[5.2,5.2,.6],children:e.jsx(ae,{lit:!1})}),e.jsx(X,{at:[.3,.9,4.62],size:1.05,color:"#ff3b30",bold:!0,children:(o==null?void 0:o.pv)??"37.0"}),e.jsx(X,{at:[.3,-.5,4.62],size:.85,color:"#35d07f",bold:!0,children:(o==null?void 0:o.sv)??"37.0"}),e.jsx(X,{at:[-2,.9,4.62],size:.34,color:"#d1d5db",children:"PV"}),e.jsx(X,{at:[-2,-.5,4.62],size:.34,color:"#d1d5db",children:"SV"}),e.jsx(j,{at:[0,-2.1,4.62],size:[4.4,.9,.05],children:e.jsx("meshStandardMaterial",{color:"#cfd3d8"})})]}),e.jsxs("group",{userData:{part:"cannula"},children:[e.jsx(L,{pts:[[0,37.8,3],[0,33,3.6],[-.7,29,6.2],[m[0],27,m[2]]],r:.45,children:e.jsx($,{lit:t("cannula")})}),e.jsxs("group",{userData:{part:"cannula",glass:!0},children:[e.jsx(v,{a:[m[0],24.4,m[2]],b:[m[0],27.6,m[2]],r:.36,children:e.jsx(E,{lit:t("cannula"),opacity:.45})}),e.jsxs("mesh",{position:m,scale:[1,1.15,1],children:[e.jsx("sphereGeometry",{args:[1.35,24,18]}),e.jsx(E,{lit:t("cannula"),opacity:.4})]}),e.jsxs("mesh",{position:[m[0],21.2,m[2]],children:[e.jsx("cylinderGeometry",{args:[.5,.16,2.2,16,1,!0]}),e.jsx(E,{lit:t("cannula"),opacity:.5})]}),e.jsx(v,{a:[m[0]-.2,26,m[2]],b:[m[0]-2.2,27.2,m[2]],r:.3,children:e.jsx(E,{lit:t("cannula"),opacity:.45})}),e.jsx(v,{a:[m[0]+.9,23.4,m[2]],b:[m[0]+3.6,22.7,m[2]],r:.62,children:e.jsx(E,{lit:t("cannula"),opacity:.4})})]}),e.jsx(j,{at:[m[0]+1.1,23.6,m[2]-.6],size:[1.3,1.9,1.1],children:e.jsx(f,{lit:t("cannula")})}),e.jsxs("mesh",{position:[m[0]+1.1,24.9,m[2]-.4],children:[e.jsx("cylinderGeometry",{args:[.55,.55,.5,14]}),e.jsx(f,{lit:t("cannula")})]})]}),h&&e.jsx(Cs,{motion:h}),e.jsxs("group",{userData:{part:"thermometer"},children:[e.jsxs("mesh",{position:[m[0]+3.8,22.65,m[2]],rotation:[0,0,Math.PI/2-.25],children:[e.jsx("cylinderGeometry",{args:[.7,.55,1.1,16]}),e.jsx($,{lit:t("thermometer")})]}),e.jsx(v,{a:[m[0]+1.6,23.2,m[2]],b:[m[0]+13,20.3,m[2]],r:.2,children:e.jsx("meshStandardMaterial",{color:t("thermometer")?O:"#f2d43d",roughness:.25,...he(t("thermometer"))})})]}),e.jsxs("group",{userData:{part:"manometer"},children:[e.jsx(j,{at:[-21.2,23,6.6],size:[7,21,.3],children:e.jsx(f,{lit:t("manometer")})}),c.map(i=>e.jsx(j,{at:[-21.2+i*3.5,23,7.1],size:[.3,21,1.3],children:e.jsx(f,{lit:t("manometer")})},i)),e.jsx(j,{at:[-21.2,25.2,6.85],size:[2.5,10.6,.2],children:e.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.4})}),Array.from({length:17},(i,p)=>p).map(i=>e.jsxs(K.Fragment,{children:[e.jsx(j,{at:[i%2?-22.05:-21.9,Ue+i*.5,6.97],size:[i%2?.6:.9,.05,.02],children:e.jsx("meshBasicMaterial",{color:"#111827"})}),i%2===0&&e.jsx(X,{at:[-20.65,Ue+i*.5,6.98],size:.42,children:String(i*10)})]},i)),e.jsx(X,{at:[-21.2,29.95,6.98],size:.4,bold:!0,children:"mmHg"}),e.jsxs("group",{userData:{part:"manometer",glass:!0},children:[e.jsx(L,{pts:[[-23,32.5,7.4],[-23,15.5,7.4],[-22.6,14.4,7.4],[-21.2,14,7.4],[-19.8,14.4,7.4],[-19.4,15.5,7.4],[-19.4,30.6,7.4],[-19,31.6,7.4],[-17.6,31.8,7.4]],r:.34,seg:90,children:e.jsx(E,{lit:t("manometer"),opacity:.4})}),e.jsx(v,{a:[-19.4,28,7.4],b:[-17.6,28,7.4],r:.3,children:e.jsx(E,{lit:t("manometer"),opacity:.4})})]}),e.jsx(L,{pts:Ds,r:.2,seg:50,children:e.jsx(jt,{})}),e.jsx(Rs,{motion:h}),e.jsx(j,{at:[-17.6,27,6.4],size:[1.9,1.9,1.5],children:e.jsx(f,{lit:t("manometer")})}),e.jsx(L,{pts:[[-17.9,31.8,7.4],[-13,32.4,8],[-7,29.6,8],[m[0]-2,27.1,m[2]]],r:.45,children:e.jsx($,{lit:t("manometer")})}),e.jsx(L,{pts:[[-17.9,28,7.4],[-13.5,27.6,9],[-10,18,12],[-8,5,14.5],[-5,.6,16.4],[2,.5,17]],r:.45,children:e.jsx($,{lit:t("manometer")})})]}),e.jsx("group",{userData:{part:"clip"},children:o!=null&&o.heart&&h?e.jsx(Gs,{motion:h,lit:t("clip")}):e.jsxs(e.Fragment,{children:[e.jsx(L,{pts:[[m[0],20.2,b],[m[0]+.25,19.9,b],[m[0],19.6,b],[m[0]-.2,19.3,b],[m[0],19,b],[m[0]+.2,19.2,b]],r:.045,seg:30,children:e.jsx(f,{lit:t("clip")})}),e.jsxs("group",{position:[m[0]+.05,19.05,b],rotation:[0,0,.32],children:[e.jsx(v,{a:[-.18,0,0],b:[-.18,-1.75,0],r:.05,seg:6,children:e.jsx(f,{lit:t("clip")})}),e.jsx(v,{a:[.2,-.15,0],b:[.2,-1.75,0],r:.05,seg:6,children:e.jsx(f,{lit:t("clip")})}),e.jsx(j,{at:[.01,-.1,0],size:[.55,.3,.14],children:e.jsx(f,{lit:t("clip")})}),e.jsxs("mesh",{position:[.01,-1.95,0],children:[e.jsx("torusGeometry",{args:[.24,.05,6,16]}),e.jsx(f,{lit:t("clip")})]})]})]})}),e.jsxs("group",{userData:{part:"pulleys"},children:[[Me,fe].map(i=>e.jsxs(K.Fragment,{children:[e.jsxs("mesh",{position:[i,13.9,6],children:[e.jsx("cylinderGeometry",{args:[.42,.42,.75,16]}),e.jsx(ae,{lit:t("pulleys")})]}),e.jsxs("mesh",{position:[i,13.6,6],children:[e.jsx("cylinderGeometry",{args:[.1,.1,.5,8]}),e.jsx(f,{lit:t("pulleys")})]}),e.jsxs("mesh",{position:[i,12.1,6.25],rotation:[0,Math.PI/4,0],children:[e.jsx("cylinderGeometry",{args:[.62,.38,2.6,4]}),e.jsx("meshStandardMaterial",{color:t("pulleys")?O:"#c49a3a",metalness:.85,roughness:.3,...he(t("pulleys"))})]}),e.jsxs("mesh",{position:[i,10.4,b],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[1,1,.22,32]}),e.jsx("meshPhysicalMaterial",{color:t("pulleys")?O:"#eef3f7",transparent:!0,opacity:.6,roughness:.1,clearcoat:1})]}),e.jsxs("mesh",{position:[i,10.4,b],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.16,.16,.5,10]}),e.jsx(f,{lit:t("pulleys")})]}),e.jsx(v,{a:[i,10.6,6.3],b:[i,10.4,b],r:.12,seg:8,children:e.jsx(f,{lit:t("pulleys")})})]},i)),o?e.jsxs(e.Fragment,{children:[e.jsx(ke,{color:x,ends:()=>[S(),[fe-.6,9.45,b]],drawn:()=>y()*2}),e.jsx(ke,{color:x,ends:()=>[[fe+1,10.4,b],_()],drawn:()=>y()*2-1}),e.jsx(ke,{color:x,ends:()=>[S(),[Me+.6,9.45,b]],drawn:()=>y()*2}),e.jsx(ke,{color:x,ends:()=>[[Me-1,10.4,b],[-22.6,12.5,6.2]],drawn:()=>y()*2-1})]}):[[ht,[fe-.6,9.45,b]],[[fe+1,10.4,b],[fe+1,20.6,b]],[ht,[Me+.6,9.45,b]],[[Me-1,10.4,b],[-22.6,12.5,6.2]]].map(([i,p],F)=>e.jsx(v,{a:i,b:p,r:.035,seg:5,children:e.jsx("meshBasicMaterial",{color:x})},F)),(!o||o.heart)&&[0,1,2].map(i=>e.jsxs("mesh",{position:[-22.4+i*.18,13,6],rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[.47,.03,4,16]}),e.jsx("meshBasicMaterial",{color:t("pulleys")?O:"#f8fafc"})]},i))]}),e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(v,{a:[20,13,6],b:[20,28.5,6],r:.4,children:e.jsx(f,{lit:t("lever")})}),e.jsxs("mesh",{position:[20,13.3,6],children:[e.jsx("sphereGeometry",{args:[.6,12,8]}),e.jsx(f,{lit:t("lever")})]}),e.jsx(j,{at:[20.6,21,b],size:[4.6,.9,.9],children:e.jsx(q,{lit:t("lever")})}),e.jsxs("mesh",{position:[18,21,b],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.45,.45,.9,12]}),e.jsx(q,{lit:t("lever")})]}),e.jsxs(Us,{motion:h,children:[e.jsx(j,{at:[25.6,20.95,b],size:[5.6,.75,.16],children:e.jsx(q,{lit:t("lever")})}),[0,1,2,3,4,5,6].map(i=>e.jsx(j,{at:[23.3+i*.7,21.4,b],size:[.35,.25,.16],children:e.jsx(q,{lit:t("lever")})},i)),e.jsxs("mesh",{position:[28.7,20.98,b],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.32,.32,.8,12]}),e.jsx(ae,{lit:t("lever")})]}),e.jsx(v,{a:[29,21,b],b:[38,21.6,b],r:.06,seg:6,children:e.jsx(f,{lit:t("lever")})}),e.jsx(j,{at:[38.4,21.65,b],size:[1.3,.7,.03],rot:[0,0,.3],children:e.jsx("meshStandardMaterial",{color:t("lever")?O:"#f1f5f9",transparent:!0,opacity:.85})})]}),e.jsx(v,{a:[21,21.4,b],b:[21,25.4,b],r:.22,children:e.jsx(q,{lit:t("lever")})}),e.jsx(v,{a:[19.6,24.4,b],b:[24.2,24.4,b],r:.22,children:e.jsx(q,{lit:t("lever")})}),e.jsxs("mesh",{position:[19.4,24.4,b],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.42,.42,.8,12]}),e.jsx(q,{lit:t("lever")})]}),e.jsx(L,{pts:Array.from({length:41},(i,p)=>[24.2+Math.sin(p*1.6)*.3,24.2-p*.07,b+Math.cos(p*1.6)*.3]),r:.035,seg:120,children:e.jsx(f,{lit:t("lever")})})]}),e.jsx("group",{userData:{part:"holders"},children:c.map(i=>e.jsxs(K.Fragment,{children:[e.jsx(j,{at:[i*(g.x+1.25),62.6,-4],size:[1.4,1.2,1.4],children:e.jsx(f,{lit:t("holders")})}),e.jsx(v,{a:[i*(g.x+1.25),63,-4],b:[i*(g.x+1.25),71,-4],r:.45,children:e.jsx(f,{lit:t("holders")})}),e.jsx(j,{at:[i*(g.x+1.25),69,-4],size:[1.5,1.5,1.5],children:e.jsx(q,{lit:t("holders")})}),e.jsx(v,{a:[i*16.5,69,-4],b:[i*7,69,-4],r:.34,children:e.jsx(q,{lit:t("holders")})}),e.jsx(j,{at:[i*6.8,69.2,-4],size:[1.3,1.1,1.1],children:e.jsx(q,{lit:t("holders")})}),e.jsxs("mesh",{position:[i*(g.x+1.25),69,-2.9],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.45,.45,.6,12]}),e.jsx(ae,{lit:t("holders")})]}),e.jsx(L,{pts:[[i*6.8,69.6,-4],[i*6.2,77.5,-4],[i*5.6,78,-4],[i*5,77.5,-4],[i*4.4,71.5,-4],[i*3.8,71.3,-4]],r:.07,seg:40,children:e.jsx(f,{lit:t("holders")})}),e.jsx(v,{a:[i*6.2,77.6,-4],b:[i*7.4,48,-3.4],r:.07,seg:6,children:e.jsx(f,{lit:t("holders")})})]},i))})]})}),Ze=[.12,.25,1.25,2.5,12.5,25,320,640],Fs=8,ze=7.5,J=15,Je=7.56,Hs=2*Math.PI*ze*10,M={w:19,h:19,d:19,y0:1.2},ts=M.y0+M.h,Z=ts+.6,W=M.d/2,Ke=Z+3,ss=9,Ie=Ke+ss+J+2.5,H=new R(21,34.5,Je+.32),De=H.x,Ge=2.2,gt=3,Be="#3b82f6",Ee=-2.35,ut=.6+Ee,ye=1536,Qe=ye/(2*Math.PI*Je),je=Math.round(J*Qe),Wt=Math.round(1.2*Qe),Ws=n=>{n.globalCompositeOperation="source-over",n.fillStyle="#17150f",n.fillRect(0,0,ye,je);for(let s=0;s<260;s++){const r=Math.random()*ye,o=Math.random()*je,t=8+Math.random()*60,l=n.createRadialGradient(r,o,0,r,o,t),a=Math.random()<.5?"40,36,28":"6,6,5";l.addColorStop(0,`rgba(${a},${.08+Math.random()*.1})`),l.addColorStop(1,`rgba(${a},0)`),n.fillStyle=l,n.fillRect(r-t,o-t,2*t,2*t)}for(let s=0;s<9e3;s++)n.fillStyle=Math.random()<.5?"rgba(60,55,45,0.25)":"rgba(0,0,0,0.3)",n.fillRect(Math.random()*ye,Math.random()*je,1.2,1.2);n.fillStyle="rgba(0,0,0,0.35)",n.fillRect(0,0,Wt,je),n.fillStyle="rgba(120,112,95,0.55)",n.fillRect(Wt-2,0,2,je)},Vs=n=>{const s=n-.01;return s<=0||s>=.09?0:s<.04?gt*Math.sin(Math.PI/2*(s/.04))**2:gt*Math.cos(Math.PI/2*((s-.04)/.05))**2},ar=()=>{const[n,s]=u.useState({on:!1,speed:6,clutch:!0,lift:3.5,leverOn:!0,contactStim:!1}),r=u.useRef([]),o=u.useRef(0),[t,l]=u.useState(0),a=u.useCallback(h=>s(x=>({...x,...h})),[]),c=u.useCallback(()=>{r.current.push(o.current)},[]);return{state:n,set:a,stimulate:c,stimuli:r,clock:o,paperKey:t,newPaper:()=>l(h=>h+1)}},rs=n=>n.on&&n.clutch&&n.speed!==Fs,$s=n=>{for(let s=n;s;s=s.parent)if(s.userData.part)return s.userData.part;return null},Vt=n=>{for(const s of n.intersections){const r=$s(s.object);if(r)return r}return null},G=({lit:n,color:s,metal:r=.3,rough:o=.55})=>e.jsx("meshStandardMaterial",{color:n?Be:s,metalness:n?.1:r,roughness:o,emissive:n?Be:"#000000",emissiveIntensity:n?.35:0}),D=({lit:n})=>e.jsx(G,{lit:n,color:"#dfe3e7",metal:1,rough:.15}),Re=({lit:n})=>e.jsx(G,{lit:n,color:"#c9cdd1",metal:.85,rough:.35}),Te=({lit:n})=>e.jsx(G,{lit:n,color:"#c9a24a",metal:.9,rough:.3}),ne=({lit:n})=>e.jsx(G,{lit:n,color:"#1d1f22",metal:.2,rough:.45}),Xe=({lit:n})=>e.jsx(G,{lit:n,color:"#ecebe5",metal:.05,rough:.45}),P=({r:n,h:s,pos:r,rot:o,seg:t=32,r2:l,children:a})=>e.jsxs("mesh",{position:r,rotation:o,children:[e.jsx("cylinderGeometry",{args:[l??n,n,s,t]}),a]}),z=({size:n,pos:s,rot:r,children:o})=>e.jsxs("mesh",{position:s,rotation:r,children:[e.jsx("boxGeometry",{args:n}),o]}),Se=({r:n,h:s,pos:r,rot:o,lit:t,color:l="#dfe3e7"})=>{const a=u.useMemo(()=>{const c=[];for(let y=0;y<=80;y++){const S=y/80*Math.PI*2,_=y%2?n:n*.92;c.push(new Le(Math.cos(S)*_,Math.sin(S)*_))}const x=new Yt(new Kt(c),{depth:s,bevelEnabled:!0,bevelSize:n*.04,bevelThickness:n*.04,bevelSegments:1});return x.translate(0,0,-s/2),x.rotateX(Math.PI/2),x},[n,s]);return e.jsx("mesh",{geometry:a,position:r,rotation:o,children:e.jsx(G,{lit:t,color:l,metal:.9,rough:.3})})},Ce=({w:n,h:s,lit:r})=>e.jsx(e.Fragment,{children:[[-1,-1],[1,-1],[-1,1],[1,1]].map(([o,t],l)=>e.jsxs("mesh",{position:[o*(n/2-.9),t*(s/2-.9),.02],scale:[1,1,.45],children:[e.jsx("sphereGeometry",{args:[.32,14,8,0,Math.PI*2,0,Math.PI/2]}),e.jsx(G,{lit:r,color:"#9aa0a6",metal:.9,rough:.3})]},l))}),ks=16.9,Xs=.72,Oe=n=>ks-n*Xs,lr=({active:n,onHover:s,onSelect:r,kymo:o,bare:t,pen:l})=>{const a=d=>n===d,{state:c,stimuli:h,clock:x,paperKey:y}=o,S=u.useRef(c);S.current=c;const _=u.useMemo(()=>{const d=document.createElement("canvas");return d.width=ye,d.height=je,d},[]),i=u.useMemo(()=>{const d=new Ss(_);return d.colorSpace=ws,d.anisotropy=8,d},[_]),p=u.useRef(null);u.useMemo(()=>{Ws(_.getContext("2d")),i.needsUpdate=!0,p.current=null},[y,_,i]);const F=u.useRef(null),Q=u.useRef(null),Y=u.useRef(null),pe=u.useRef(null),w=u.useRef(null),T=u.useRef(null),et=u.useRef(null),tt=u.useRef(null),st=u.useRef(null),rt=u.useRef(null),nt=u.useRef(null),is=u.useRef({phi:0,rate:0,lift:c.lift,swing:0,slot:Oe(c.speed),clutch:1,t:performance.now()/1e3,flash:0,dirty:0});ue(()=>{const d=is.current,C=S.current,ee=_.getContext("2d"),_t=performance.now()/1e3,be=Math.min(.1,_t-d.t);d.t=_t;const it=x.current+be,os=rs(C)?Ze[C.speed]/10/ze:0,Ne=V=>Math.min(1,be*V);d.lift+=(C.lift-d.lift)*Ne(6),d.swing+=((C.leverOn?0:1)-d.swing)*Ne(5),d.slot+=(Oe(C.speed)-d.slot)*Ne(12),d.clutch+=((C.clutch?1:0)-d.clutch)*Ne(10),ee.strokeStyle="rgba(236,230,214,0.92)",ee.lineWidth=2.2,ee.lineCap="round",ee.lineJoin="round",ee.beginPath();let ot=!1;const Pt=Math.max(1,Math.ceil(be/.002)),at=be/Pt;let Fe=0;for(let V=1;V<=Pt;V++){const At=it-be+V*at;d.rate+=(os-d.rate)*Math.min(1,at*8),d.rate<1e-5&&(d.rate=0);const ls=d.phi;if(d.phi-=d.rate*at,d.rate>0&&Math.floor((-ls-ut+Ee)/(2*Math.PI))!==Math.floor((-d.phi-ut+Ee)/(2*Math.PI))&&(d.flash=1,C.contactStim&&h.current.push(At)),Fe=l?0:Math.min(h.current.reduce((ds,hs)=>ds+Vs(At-hs),0),gt*1.6),l?!l.current.on:d.swing>.04){p.current=null;continue}const cs=l?l.current.y:H.y+Fe,ve=(Ke+d.lift+J-cs)*Qe,He=(-d.phi%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*ye;if(ve<2||ve>je-2){p.current=null;continue}const xe=p.current;xe&&Math.abs(He-xe.u)<ye/2&&Math.abs(ve-xe.v)<1.5*Qe&&(Math.abs(He-xe.u)>.05||Math.abs(ve-xe.v)>.05)&&(ee.moveTo(xe.u,xe.v),ee.lineTo(He,ve),ot=!0),p.current={u:He,v:ve}}ot&&(ee.stroke(),d.dirty++),d.dirty&&(d.dirty>1||!ot)&&(i.needsUpdate=!0,d.dirty=0),h.current=h.current.filter(V=>it-V<.2),x.current=it,F.current&&(F.current.rotation.y=d.phi),Q.current&&(Q.current.position.y=Ke+d.lift),pe.current&&(pe.current.rotation.y=d.swing*.07),Y.current&&(Y.current.rotation.z=-Math.asin(Fe/De)),et.current&&(et.current.position.y=d.slot),tt.current&&(tt.current.rotation.z=.7-1.4*(1-d.clutch)),st.current&&(st.current.rotation.x=C.on?-.22:.22);const Lt=Fe*Ge/De,as=H.y-.3-Lt;if(T.current){const V=as-pt;T.current.scale.y=V,T.current.position.y=pt+V/2}if(w.current){const V=Lt/qe;w.current.scale.set(1+V*2.5,1-V,1+V*2.5)}rt.current&&(rt.current.emissiveIntensity=C.on?1.6:0),d.flash=Math.max(0,d.flash-be*8),nt.current&&(nt.current.emissiveIntensity=d.flash*3)});const Et=[Math.sin(Ee),Math.cos(Ee)];return e.jsxs("group",{onPointerMove:d=>{d.stopPropagation(),s(Vt(d))},onPointerOut:()=>s(null),onClick:d=>{d.stopPropagation();const C=Vt(d);C&&r(C)},children:[!t&&e.jsxs("mesh",{position:[7,-.5,2],children:[e.jsx("boxGeometry",{args:[60,1,38]}),e.jsx("meshStandardMaterial",{color:"#8a6a4a",roughness:.8})]}),e.jsxs("group",{userData:{part:"base"},children:[e.jsx(z,{size:[M.w,M.h,M.d],pos:[0,M.y0+M.h/2,0],children:e.jsx(Xe,{lit:a("base")})}),e.jsx(z,{size:[M.w+.6,.6,M.d+.6],pos:[0,ts+.3,0],children:e.jsx(Xe,{lit:a("base")})}),e.jsx(z,{size:[M.w+.3,.5,M.d+.3],pos:[0,M.y0+.25,0],children:e.jsx(Xe,{lit:a("base")})}),[[-1,-1],[1,-1],[-1,1],[1,1]].map(([d,C],ee)=>e.jsx(P,{r:1.1,r2:1.2,h:1.2,pos:[d*(M.w/2-1.8),.6,C*(M.d/2-1.8)],children:e.jsx(ne,{lit:a("base")})},ee)),e.jsx("group",{position:[0,M.y0+M.h/2,W+.01],children:e.jsx(Ce,{w:M.w,h:M.h,lit:a("base")})}),e.jsx("group",{position:[M.w/2+.01,M.y0+M.h/2,0],rotation:[0,Math.PI/2,0],children:e.jsx(Ce,{w:M.d,h:M.h,lit:a("base")})}),e.jsx("group",{position:[-19/2-.01,M.y0+M.h/2,0],rotation:[0,-Math.PI/2,0],children:e.jsx(Ce,{w:M.d,h:M.h,lit:a("base")})}),e.jsx("group",{position:[0,Z+.01,0],rotation:[-Math.PI/2,0,0],children:e.jsx(Ce,{w:M.w+.6,h:M.d+.6,lit:a("base")})}),[-1,1].map(d=>[0,1,2,3,4,5].map(C=>e.jsx(z,{size:[.35,.45,4.2],pos:[-19/2-.12,M.y0+5+C*1.3,d*3.2],rot:[0,0,.5],children:e.jsx(Xe,{lit:a("base")})},`${d}${C}`)))]}),e.jsxs("group",{userData:{part:"speed"},children:[e.jsxs("group",{position:[0,14,W+.06],children:[e.jsx(z,{size:[5.8,10.4,.12],pos:[0,0,0],children:e.jsx(G,{lit:a("speed"),color:"#141517",metal:.3,rough:.5})}),e.jsx(Ce,{w:5.8,h:10.4,lit:a("speed")}),e.jsx(ie,{font:le,position:[0,4.5,.08],fontSize:.36,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"SPEED MM PER SEC."}),e.jsx(ie,{font:le,position:[0,3.95,.08],fontSize:.3,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:'WITH 6" DIA CYLINDER'}),e.jsx(ie,{font:le,position:[0,-4.25,.08],fontSize:.32,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"E-8 RECORDING DRUM"}),e.jsx(ie,{font:qt,position:[0,-4.75,.08],fontSize:.28,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"220 V AC"}),e.jsx(z,{size:[.75,7.3,.05],pos:[-1,Oe(4)-14,.07],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),[...Ze.map(String),"N"].map((d,C)=>e.jsxs("group",{position:[0,Oe(C)-14,.08],children:[e.jsx(z,{size:[.5,.12,.02],pos:[-.38,0,0],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),e.jsx(ie,{font:le,position:[1.3,0,0],fontSize:.4,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:d.replace(/^0\./,".")})]},d))]}),e.jsxs("group",{ref:et,position:[0,Oe(c.speed),W+.15],children:[e.jsx(z,{size:[1.3,.45,.9],pos:[-1,0,.45],children:e.jsx(D,{lit:a("speed")})}),e.jsx(z,{size:[1.3,.25,.4],pos:[-1,.3,.75],children:e.jsx(D,{lit:a("speed")})})]})]}),e.jsxs("group",{userData:{part:"switch"},children:[e.jsx(z,{size:[1.7,2.5,.25],pos:[-5.6,5.6,W+.12],children:e.jsx(ne,{lit:a("switch")})}),e.jsx("group",{ref:st,position:[-5.6,5.6,W+.3],children:e.jsxs("mesh",{children:[e.jsx("boxGeometry",{args:[1.2,1.95,.35]}),e.jsx("meshStandardMaterial",{ref:rt,color:a("switch")?Be:"#c4161c",emissive:"#ff2a1f",emissiveIntensity:0,roughness:.25})]})}),e.jsx(ie,{font:le,position:[-5.6,3.95,W+.02],fontSize:.35,color:"#3a3a3a",anchorX:"center",anchorY:"middle",children:"ON"}),e.jsx(z,{size:[2.2,1.6,.25],pos:[-5.6,2.6,W+.12],children:e.jsx(ne,{lit:a("switch")})}),e.jsx(z,{size:[1.6,1.2,1.1],pos:[-5.6,2.6,W+.8],children:e.jsx(ne,{lit:a("switch")})}),e.jsx("mesh",{geometry:Ks,children:e.jsx(G,{lit:a("switch"),color:"#2a2b2e",metal:0,rough:.7})})]}),e.jsxs("group",{userData:{part:"clutch"},position:[M.w/2+.01,13,0],rotation:[0,Math.PI/2,0],children:[e.jsxs("mesh",{position:[0,0,.02],children:[e.jsx("circleGeometry",{args:[3.3,48]}),e.jsx(G,{lit:a("clutch"),color:"#f6f5f0",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[0,0,.03],children:[e.jsx("ringGeometry",{args:[2.85,3.05,64]}),e.jsx(G,{lit:a("clutch"),color:"#d0202a",metal:0,rough:.5})]}),e.jsx(ie,{font:le,position:[0,2.25,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"NEUTRALISING CLUTCH"}),e.jsx(ie,{font:le,position:[-1.7,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"ENG"}),e.jsx(ie,{font:le,position:[1.6,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"DIS ENG"}),e.jsx(P,{r:.55,h:.5,pos:[0,0,.25],rot:[Math.PI/2,0,0],children:e.jsx(D,{lit:a("clutch")})}),e.jsxs("group",{ref:tt,position:[0,0,.55],children:[e.jsx(P,{r:.28,h:2.4,pos:[0,1.2,.2],children:e.jsx(D,{lit:a("clutch")})}),e.jsx(P,{r:.33,h:1.2,pos:[0,2.5,.75],rot:[Math.PI/2,0,0],children:e.jsx(D,{lit:a("clutch")})})]})]}),e.jsxs("group",{userData:{part:"contact"},position:[Et[0]*8.5,Z,Et[1]*8.5],rotation:[0,Ee,0],children:[e.jsxs("mesh",{position:[0,1.1,0],children:[e.jsx("boxGeometry",{args:[5,2.2,2.4]}),e.jsx("meshPhysicalMaterial",{color:a("contact")?Be:"#e8f3f6",transparent:!0,opacity:.45,roughness:.08,clearcoat:1,depthWrite:!1})]}),[-1,1].map(d=>e.jsxs("group",{position:[d*1.4,2.2,0],children:[e.jsx(Se,{r:.5,h:1.1,pos:[0,.55,0],lit:a("contact"),color:d<0?"#c0161c":"#1d1f22"}),e.jsx(P,{r:.18,h:.5,pos:[0,1.3,0],children:e.jsx(Te,{lit:a("contact")})})]},d)),e.jsx(z,{size:[.08,1,3.8],pos:[0,1.6,-3.1],children:e.jsx(Te,{lit:a("contact")})}),e.jsxs("mesh",{position:[0,1.6,-5],children:[e.jsx("sphereGeometry",{args:[.16,10,8]}),e.jsx("meshStandardMaterial",{ref:nt,color:"#fde68a",emissive:"#fff3b0",emissiveIntensity:0})]})]}),e.jsx("group",{userData:{part:"spindle"},children:e.jsx(P,{r:2.6,h:.35,pos:[0,Z+.17,0],seg:40,children:e.jsx(D,{lit:a("spindle")})})}),e.jsxs("group",{ref:F,children:[e.jsxs("group",{userData:{part:"spindle"},children:[e.jsx(P,{r:1.5,r2:1.3,h:1.2,pos:[0,Z+.9,0],seg:32,children:e.jsx(D,{lit:a("spindle")})}),e.jsx(P,{r:.75,h:Ie-Z,pos:[0,(Ie+Z)/2,0],seg:24,children:e.jsx(D,{lit:a("spindle")})})]}),e.jsxs("group",{userData:{part:"contact"},rotation:[0,ut,0],children:[e.jsx(P,{r:1.2,h:1,pos:[0,Z+2,0],children:e.jsx(ne,{lit:a("contact")})}),e.jsx(z,{size:[.6,.5,3.2],pos:[0,Z+2.1,2.1],children:e.jsx(ne,{lit:a("contact")})}),e.jsxs("mesh",{position:[0,Z+2.1,3.9],rotation:[Math.PI/2,0,0],children:[e.jsx("coneGeometry",{args:[.32,.9,12]}),e.jsx(ne,{lit:a("contact")})]}),e.jsx(P,{r:.25,h:.7,pos:[.85,Z+2,0],rot:[0,0,Math.PI/2],children:e.jsx(D,{lit:a("contact")})})]}),e.jsxs("group",{userData:{part:"lift"},children:[e.jsx(P,{r:1,h:1.2,pos:[0,Ie-.2,0],children:e.jsx(D,{lit:a("lift")})}),e.jsx(Se,{r:.85,h:1.8,pos:[0,Ie+1.3,0],lit:a("lift")}),e.jsx(P,{r:.5,h:.5,pos:[0,Ie+2.45,0],children:e.jsx(D,{lit:a("lift")})})]}),e.jsxs("group",{ref:Q,position:[0,Ke+c.lift,0],children:[e.jsxs("group",{userData:{part:"drum"},children:[e.jsxs("mesh",{position:[0,J/2,0],children:[e.jsx("cylinderGeometry",{args:[ze,ze,J,96,1,!0]}),e.jsx("meshStandardMaterial",{color:a("drum")?Be:"#16171a",metalness:.3,roughness:.6,side:Xt})]}),[.15,J-.4].map(d=>e.jsxs("group",{position:[0,d,0],children:[e.jsx(z,{size:[ze*2-.2,.5,.9],pos:[0,0,0],children:e.jsx(ne,{lit:a("drum")})}),e.jsx(z,{size:[.9,.5,ze*2-.2],pos:[0,0,0],children:e.jsx(ne,{lit:a("drum")})}),e.jsx(P,{r:1.6,h:1,pos:[0,0,0],children:e.jsx(ne,{lit:a("drum")})})]},d)),e.jsx(P,{r:1.25,h:2,pos:[0,J+.9,0],children:e.jsx(D,{lit:a("drum")})}),e.jsx(P,{r:.22,h:.8,pos:[0,J+1.1,1.55],rot:[Math.PI/2,0,0],children:e.jsx(D,{lit:a("drum")})}),e.jsx(Se,{r:.5,h:.6,pos:[0,J+1.1,2.2],rot:[Math.PI/2,0,0],lit:a("drum"),color:"#1d1f22"})]}),e.jsxs("mesh",{position:[0,J/2,0],userData:{part:"paper"},children:[e.jsx("cylinderGeometry",{args:[Je,Je,J,128,1,!0]}),e.jsx("meshStandardMaterial",{map:i,color:a("paper")?"#9ec5ff":"#ffffff",roughness:.85,metalness:0})]})]})]}),!t&&e.jsxs(e.Fragment,{children:[e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(qs,{pos:[I.x+1.5,0,I.z-1],lit:a("stand")}),e.jsx(P,{r:.55,h:44,pos:[I.x,22.6,I.z],seg:20,children:e.jsx(D,{lit:a("stand")})}),e.jsx(z,{size:[2,2,2],pos:[I.x,Ye,I.z],children:e.jsx(Re,{lit:a("stand")})}),e.jsx(Se,{r:.5,h:1,pos:[I.x,Ye,I.z+1.4],rot:[Math.PI/2,0,0],lit:a("stand"),color:"#1d1f22"}),e.jsx(P,{r:.4,h:I.x-H.x-.5,pos:[(I.x+H.x+.5)/2,Ye,I.z],rot:[0,0,Math.PI/2],children:e.jsx(D,{lit:a("stand")})}),e.jsx(z,{size:[2,2,2],pos:[I.x,we,I.z],children:e.jsx(Re,{lit:a("stand")})}),e.jsx(Se,{r:.5,h:1,pos:[I.x,we,I.z+1.4],rot:[Math.PI/2,0,0],lit:a("stand"),color:"#1d1f22"}),e.jsx(P,{r:.35,h:I.x-me-.8,pos:[(I.x+me+.8)/2,we,I.z],rot:[0,0,Math.PI/2],children:e.jsx(D,{lit:a("stand")})}),e.jsx(z,{size:[1.6,1.2,1.8],pos:[me,we,I.z],children:e.jsx(Re,{lit:a("stand")})}),e.jsx(P,{r:.15,h:.8,pos:[me,we,I.z+1.25],rot:[Math.PI/2,0,0],children:e.jsx(D,{lit:a("stand")})}),e.jsx(Se,{r:.4,h:.5,pos:[me,we,I.z+1.8],rot:[Math.PI/2,0,0],lit:a("stand"),color:"#1d1f22"})]}),e.jsxs("group",{ref:pe,position:[H.x,H.y,H.z],children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(z,{size:[1.1,1.9,.22],pos:[0,.25,-.75],children:e.jsx(Te,{lit:a("lever")})}),e.jsx(z,{size:[1.1,1.9,.22],pos:[0,.25,.75],children:e.jsx(Te,{lit:a("lever")})}),e.jsx(z,{size:[1.1,.5,1.72],pos:[0,Ye-H.y,0],children:e.jsx(Te,{lit:a("lever")})}),e.jsx(P,{r:.1,h:1.9,pos:[0,0,0],rot:[Math.PI/2,0,0],children:e.jsx(D,{lit:a("lever")})}),[-1,1].map(d=>e.jsx(P,{r:.2,h:.12,pos:[0,0,d*.92],rot:[Math.PI/2,0,0],seg:6,children:e.jsx(D,{lit:a("lever")})},d))]}),e.jsxs("group",{ref:Y,children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(z,{size:[De-.3,.5,.08],pos:[-(De-.3)/2,0,0],children:e.jsx(Re,{lit:a("lever")})}),e.jsx(z,{size:[Ge+.6,.6,.12],pos:[(Ge+.6)/2-.2,0,0],children:e.jsx(Re,{lit:a("lever")})}),e.jsxs("mesh",{position:[Ge,-.3,0],rotation:[Math.PI/2,0,0],children:[e.jsx("torusGeometry",{args:[.22,.05,8,16]}),e.jsx(D,{lit:a("lever")})]})]}),e.jsxs("group",{userData:{part:"stylus"},position:[-De,0,0],children:[e.jsx(z,{size:[.9,.35,.04],pos:[.3,0,0],children:e.jsx(G,{lit:a("stylus"),color:"#e8dfc8",metal:0,rough:.6})}),e.jsx(z,{size:[.06,.12,.34],pos:[0,0,-.16],rot:[0,.35,0],children:e.jsx(G,{lit:a("stylus"),color:"#e8dfc8",metal:0,rough:.6})})]})]})]}),e.jsxs("mesh",{ref:T,position:[me,pt+2,H.z],userData:{part:"muscle"},children:[e.jsx("cylinderGeometry",{args:[.03,.03,1,6]}),e.jsx("meshStandardMaterial",{color:"#f5f0e1",roughness:.9})]}),e.jsxs("group",{userData:{part:"muscle"},position:[me,zt,H.z],children:[e.jsx(P,{r:.2,h:ns+.8,pos:[0,-3.4000000000000004/2,0],seg:12,children:e.jsx(G,{lit:a("muscle"),color:"#efe7d6",metal:0,rough:.6})}),e.jsxs("mesh",{position:[0,-.05,0],scale:[1.25,.8,1],children:[e.jsx("sphereGeometry",{args:[.34,16,12]}),e.jsx(G,{lit:a("muscle"),color:"#efe7d6",metal:0,rough:.6})]}),e.jsxs("group",{ref:w,children:[e.jsx("mesh",{geometry:Ys,children:e.jsx(G,{lit:a("muscle"),color:"#b4485a",metal:0,rough:.55})}),e.jsx(P,{r:.06,r2:.1,h:qe-3.4,pos:[0,(qe+3.4)/2,0],seg:8,children:e.jsx(G,{lit:a("muscle"),color:"#efe9df",metal:0,rough:.4})})]})]})]})]})},qe=4.5,zt=H.y-13,pt=zt+qe,me=H.x+Ge,ns=2.6,we=zt-ns,Ye=H.y+1.35,I={x:26,z:H.z},Ys=new bt([[0,0],[.4,.04],[.82,.5],[.95,1.2],[.85,2],[.55,2.8],[.2,3.35],[.08,3.5]].map(([n,s])=>new Le(n,s)),28),Ks=new vt(new Mt([[-5.6,2.6,W+1.3],[-5.6,2.4,W+2.4],[-5.8,1.1,W+3.3],[-6.4,.3,W+4.6],[-9,.3,W+6.4],[-14,.3,W+7.2],[-20,.3,W+7.6]].map(([n,s,r])=>new R(n,s,r))),80,.28,10,!1),qs=({pos:n,lit:s})=>{const r=u.useMemo(()=>{const o=new Kt,t=7;[Math.PI/2,Math.PI/2+2*Math.PI/3,Math.PI/2+4*Math.PI/3].forEach((a,c)=>{const h=Math.cos(a)*t,x=Math.sin(a)*t;c===0?o.moveTo(h,x):o.lineTo(h,x)}),o.closePath();const l=new Yt(o,{depth:1.3,bevelEnabled:!0,bevelSize:.5,bevelThickness:.3,bevelSegments:3});return l.rotateX(-Math.PI/2),l},[]);return e.jsx("group",{position:n,rotation:[0,.3,0],children:e.jsx("mesh",{geometry:r,position:[0,.3,0],children:e.jsx(G,{lit:s,color:"#1f2a3a",metal:.4,rough:.5})})})},Zs=n=>{const s=Hs/n;return s<60?`${s.toFixed(s<10?2:1)} s`:s<3600?`${Math.round(s/60)} min`:`${(s/3600).toFixed(1)} h`},cr=({kymo:n})=>{const{state:s,set:r,stimulate:o,newPaper:t}=n,l=c=>`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${c?"bg-amber-500/20 border-amber-400 text-amber-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,a=rs(s)?`one turn: ${Zs(Ze[s.speed])}`:s.on?"drum not driven":"motor off";return e.jsxs("section",{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>r({on:!s.on}),className:`flex-1 ${l(s.on)}`,children:s.on?"Motor ON":"Motor OFF"}),e.jsx("button",{onClick:()=>r({clutch:!s.clutch}),className:`flex-1 ${l(s.clutch)}`,children:s.clutch?"Clutch engaged":"Clutch disengaged"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:[e.jsx("span",{children:"Speed lever (mm/s)"}),e.jsx("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:a})]}),e.jsx("div",{className:"grid grid-cols-3 gap-1.5",children:[...Ze.map(String),"N"].map((c,h)=>e.jsx("button",{onClick:()=>r({speed:h}),className:l(s.speed===h),children:c==="N"?"N (neutral)":c},c))})]}),e.jsxs("label",{className:"block",children:[e.jsxs("span",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1",children:[e.jsx("span",{children:"Drum height (screw lift)"}),e.jsxs("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:[s.lift.toFixed(1)," cm"]})]}),e.jsx("input",{type:"range",min:0,max:ss,step:.1,value:s.lift,onChange:c=>r({lift:+c.target.value}),className:"w-full accent-amber-400","aria-label":"Drum height"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:o,className:"flex-1 px-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold",children:"Stimulate"}),e.jsx("button",{onClick:()=>r({contactStim:!s.contactStim}),className:`flex-1 ${l(s.contactStim)}`,children:s.contactStim?"Contact stimulates every turn":"Stimulate from contact"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>r({leverOn:!s.leverOn}),className:`flex-1 ${l(s.leverOn)}`,children:s.leverOn?"Lever on drum":"Lever off drum"}),e.jsx("button",{onClick:t,className:"flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold",children:"Fresh smoked paper"})]})]})};export{mt as A,sr as C,Bt as E,lr as K,or as L,rr as N,nr as a,cr as b,ir as l,ar as u};
