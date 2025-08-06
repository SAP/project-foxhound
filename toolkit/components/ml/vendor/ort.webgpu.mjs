/*!
 * ONNX Runtime Web v1.20.0-dev.20240827-1d059b8702
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var pn=Object.defineProperty;var su=Object.getOwnPropertyDescriptor;var au=Object.getOwnPropertyNames;var uu=Object.prototype.hasOwnProperty;var mn=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,n)=>(typeof require<"u"?require:t)[n]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var A=(e,t)=>()=>(e&&(t=e(e=0)),t);var yt=(e,t)=>{for(var n in t)pn(e,n,{get:t[n],enumerable:!0})},du=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of au(t))!uu.call(e,o)&&o!==n&&pn(e,o,{get:()=>t[o],enumerable:!(r=su(t,o))||r.enumerable});return e};var fn=e=>du(pn({},"__esModule",{value:!0}),e);var bt,Ne,We,lu,wt,$t=A(()=>{"use strict";bt=new Map,Ne=[],We=(e,t,n)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let r=bt.get(e);if(r===void 0)bt.set(e,{backend:t,priority:n});else{if(r.priority>n)return;if(r.priority===n&&r.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${n}`)}if(n>=0){let o=Ne.indexOf(e);o!==-1&&Ne.splice(o,1);for(let i=0;i<Ne.length;i++)if(bt.get(Ne[i]).priority<=n){Ne.splice(i,0,e);return}Ne.push(e)}return}throw new TypeError("not a valid backend")},lu=async e=>{let t=bt.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let n=!!t.initPromise;try{return n||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(r){return n||(t.error=`${r}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},wt=async e=>{let t=e.executionProviders||[],n=t.map(u=>typeof u=="string"?u:u.name),r=n.length===0?Ne:n,o,i=[],s=new Set;for(let u of r){let d=await lu(u);typeof d=="string"?i.push({name:u,err:d}):(o||(o=d),o===d&&s.add(u))}if(!o)throw new Error(`no available backend found. ERR: ${i.map(u=>`[${u.name}] ${u.err}`).join(", ")}`);for(let{name:u,err:d}of i)n.includes(u)&&console.warn(`removing requested execution provider "${u}" from session options because it is not available: ${d}`);let a=t.filter(u=>s.has(typeof u=="string"?u:u.name));return[o,new Proxy(e,{get:(u,d)=>d==="executionProviders"?a:Reflect.get(u,d)})]}});var sr=A(()=>{"use strict";$t()});var ar,ur=A(()=>{"use strict";ar="1.20.0-dev.20240827-5d54dc1462"});var dr,we,hn=A(()=>{"use strict";ur();dr="warning",we={wasm:{},webgl:{},webgpu:{},versions:{common:ar},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);dr=e}},get logLevel(){return dr}};Object.defineProperty(we,"logLevel",{enumerable:!0})});var X,lr=A(()=>{"use strict";hn();X=we});var cr,pr,mr=A(()=>{"use strict";cr=(e,t)=>{let n=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);n.width=e.dims[3],n.height=e.dims[2];let r=n.getContext("2d");if(r!=null){let o,i;t?.tensorLayout!==void 0&&t.tensorLayout==="NHWC"?(o=e.dims[2],i=e.dims[3]):(o=e.dims[3],i=e.dims[2]);let s=t?.format!==void 0?t.format:"RGB",a=t?.norm,u,d;a===void 0||a.mean===void 0?u=[255,255,255,255]:typeof a.mean=="number"?u=[a.mean,a.mean,a.mean,a.mean]:(u=[a.mean[0],a.mean[1],a.mean[2],0],a.mean[3]!==void 0&&(u[3]=a.mean[3])),a===void 0||a.bias===void 0?d=[0,0,0,0]:typeof a.bias=="number"?d=[a.bias,a.bias,a.bias,a.bias]:(d=[a.bias[0],a.bias[1],a.bias[2],0],a.bias[3]!==void 0&&(d[3]=a.bias[3]));let c=i*o,l=0,p=c,f=c*2,m=-1;s==="RGBA"?(l=0,p=c,f=c*2,m=c*3):s==="RGB"?(l=0,p=c,f=c*2):s==="RBG"&&(l=0,f=c,p=c*2);for(let h=0;h<i;h++)for(let y=0;y<o;y++){let w=(e.data[l++]-d[0])*u[0],g=(e.data[p++]-d[1])*u[1],b=(e.data[f++]-d[2])*u[2],$=m===-1?255:(e.data[m++]-d[3])*u[3];r.fillStyle="rgba("+w+","+g+","+b+","+$+")",r.fillRect(y,h,1,1)}if("toDataURL"in n)return n.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},pr=(e,t)=>{let n=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),r;if(n!=null){let o,i,s;t?.tensorLayout!==void 0&&t.tensorLayout==="NHWC"?(o=e.dims[2],i=e.dims[1],s=e.dims[3]):(o=e.dims[3],i=e.dims[2],s=e.dims[1]);let a=t!==void 0&&t.format!==void 0?t.format:"RGB",u=t?.norm,d,c;u===void 0||u.mean===void 0?d=[255,255,255,255]:typeof u.mean=="number"?d=[u.mean,u.mean,u.mean,u.mean]:(d=[u.mean[0],u.mean[1],u.mean[2],255],u.mean[3]!==void 0&&(d[3]=u.mean[3])),u===void 0||u.bias===void 0?c=[0,0,0,0]:typeof u.bias=="number"?c=[u.bias,u.bias,u.bias,u.bias]:(c=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(c[3]=u.bias[3]));let l=i*o;if(t!==void 0&&(t.format!==void 0&&s===4&&t.format!=="RGBA"||s===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let p=4,f=0,m=1,h=2,y=3,w=0,g=l,b=l*2,$=-1;a==="RGBA"?(w=0,g=l,b=l*2,$=l*3):a==="RGB"?(w=0,g=l,b=l*2):a==="RBG"&&(w=0,b=l,g=l*2),r=n.createImageData(o,i);for(let _=0;_<i*o;f+=p,m+=p,h+=p,y+=p,_++)r.data[f]=(e.data[w++]-c[0])*d[0],r.data[m]=(e.data[g++]-c[1])*d[1],r.data[h]=(e.data[b++]-c[2])*d[2],r.data[y]=$===-1?255:(e.data[$++]-c[3])*d[3]}else throw new Error("Can not access image data");return r}});var gn,fr,hr,gr,yr,br=A(()=>{"use strict";_t();gn=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:n,width:r}=t,o=t.norm??{mean:255,bias:0},i,s;typeof o.mean=="number"?i=[o.mean,o.mean,o.mean,o.mean]:i=[o.mean[0],o.mean[1],o.mean[2],o.mean[3]??255],typeof o.bias=="number"?s=[o.bias,o.bias,o.bias,o.bias]:s=[o.bias[0],o.bias[1],o.bias[2],o.bias[3]??0];let a=t.format!==void 0?t.format:"RGBA",u=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",d=n*r,c=u==="RGBA"?new Float32Array(d*4):new Float32Array(d*3),l=4,p=0,f=1,m=2,h=3,y=0,w=d,g=d*2,b=-1;a==="RGB"&&(l=3,p=0,f=1,m=2,h=-1),u==="RGBA"?b=d*3:u==="RBG"?(y=0,g=d,w=d*2):u==="BGR"&&(g=0,w=d,y=d*2);for(let _=0;_<d;_++,p+=l,m+=l,f+=l,h+=l)c[y++]=(e[p]+s[0])/i[0],c[w++]=(e[f]+s[1])/i[1],c[g++]=(e[m]+s[2])/i[2],b!==-1&&h!==-1&&(c[b++]=(e[h]+s[3])/i[3]);return u==="RGBA"?new pe("float32",c,[1,4,n,r]):new pe("float32",c,[1,3,n,r])},fr=async(e,t)=>{let n=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,r=typeof ImageData<"u"&&e instanceof ImageData,o=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,i=typeof e=="string",s,a=t??{},u=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},d=c=>c instanceof HTMLCanvasElement||c instanceof OffscreenCanvas?c.getContext("2d"):null;if(n){let c=u();c.width=e.width,c.height=e.height;let l=d(c);if(l!=null){let p=e.height,f=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(p=t.resizedHeight,f=t.resizedWidth),t!==void 0){if(a=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");a.tensorFormat="RGBA",a.height=p,a.width=f}else a.tensorFormat="RGBA",a.height=p,a.width=f;l.drawImage(e,0,0),s=l.getImageData(0,0,f,p).data}else throw new Error("Can not access image data")}else if(r){let c,l;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(c=t.resizedHeight,l=t.resizedWidth):(c=e.height,l=e.width),t!==void 0&&(a=t),a.format="RGBA",a.height=c,a.width=l,t!==void 0){let p=u();p.width=l,p.height=c;let f=d(p);if(f!=null)f.putImageData(e,0,0),s=f.getImageData(0,0,l,c).data;else throw new Error("Can not access image data")}else s=e.data}else if(o){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let c=u();c.width=e.width,c.height=e.height;let l=d(c);if(l!=null){let p=e.height,f=e.width;return l.drawImage(e,0,0,f,p),s=l.getImageData(0,0,f,p).data,a.height=p,a.width=f,gn(s,a)}else throw new Error("Can not access image data")}else{if(i)return new Promise((c,l)=>{let p=u(),f=d(p);if(!e||!f)return l();let m=new Image;m.crossOrigin="Anonymous",m.src=e,m.onload=()=>{p.width=m.width,p.height=m.height,f.drawImage(m,0,0,p.width,p.height);let h=f.getImageData(0,0,p.width,p.height);a.height=p.height,a.width=p.width,c(gn(h.data,a))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(s!==void 0)return gn(s,a);throw new Error("Input data provided is not supported - aborted tensor creation")},hr=(e,t)=>{let{width:n,height:r,download:o,dispose:i}=t,s=[1,r,n,4];return new pe({location:"texture",type:"float32",texture:e,dims:s,download:o,dispose:i})},gr=(e,t)=>{let{dataType:n,dims:r,download:o,dispose:i}=t;return new pe({location:"gpu-buffer",type:n??"float32",gpuBuffer:e,dims:r,download:o,dispose:i})},yr=(e,t,n)=>new pe({location:"cpu-pinned",type:e,data:t,dims:n??[t.length]})});var Ge,nt,wr,$r,_r=A(()=>{"use strict";Ge=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),nt=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),wr=!1,$r=()=>{if(!wr){wr=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,n=typeof Float16Array<"u"&&Float16Array.from;e&&(Ge.set("int64",BigInt64Array),nt.set(BigInt64Array,"int64")),t&&(Ge.set("uint64",BigUint64Array),nt.set(BigUint64Array,"uint64")),n?(Ge.set("float16",Float16Array),nt.set(Float16Array,"float16")):Ge.set("float16",Uint16Array)}}});var vr,xr,Sr=A(()=>{"use strict";_t();vr=e=>{let t=1;for(let n=0;n<e.length;n++){let r=e[n];if(typeof r!="number"||!Number.isSafeInteger(r))throw new TypeError(`dims[${n}] must be an integer, got: ${r}`);if(r<0)throw new RangeError(`dims[${n}] must be a non-negative integer, got: ${r}`);t*=r}return t},xr=(e,t)=>{switch(e.location){case"cpu":return new pe(e.type,e.data,t);case"cpu-pinned":return new pe({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new pe({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new pe({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}});var pe,_t=A(()=>{"use strict";mr();br();_r();Sr();pe=class{constructor(t,n,r){$r();let o,i;if(typeof t=="object"&&"location"in t)switch(this.dataLocation=t.location,o=t.type,i=t.dims,t.location){case"cpu-pinned":{let a=Ge.get(o);if(!a)throw new TypeError(`unsupported type "${o}" to create tensor from pinned buffer`);if(!(t.data instanceof a))throw new TypeError(`buffer should be of type ${a.name}`);this.cpuData=t.data;break}case"texture":{if(o!=="float32")throw new TypeError(`unsupported type "${o}" to create tensor from texture`);this.gpuTextureData=t.texture,this.downloader=t.download,this.disposer=t.dispose;break}case"gpu-buffer":{if(o!=="float32"&&o!=="float16"&&o!=="int32"&&o!=="int64"&&o!=="uint32"&&o!=="uint8"&&o!=="bool"&&o!=="uint4"&&o!=="int4")throw new TypeError(`unsupported type "${o}" to create tensor from gpu buffer`);this.gpuBufferData=t.gpuBuffer,this.downloader=t.download,this.disposer=t.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let a,u;if(typeof t=="string")if(o=t,u=r,t==="string"){if(!Array.isArray(n))throw new TypeError("A string tensor's data must be a string array.");a=n}else{let d=Ge.get(t);if(d===void 0)throw new TypeError(`Unsupported tensor type: ${t}.`);if(Array.isArray(n)){if(t==="float16"&&d===Uint16Array||t==="uint4"||t==="int4")throw new TypeError(`Creating a ${t} tensor from number array is not supported. Please use ${d.name} as data.`);t==="uint64"||t==="int64"?a=d.from(n,BigInt):a=d.from(n)}else if(n instanceof d)a=n;else throw new TypeError(`A ${o} tensor's data must be type of ${d}`)}else if(u=n,Array.isArray(t)){if(t.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let d=typeof t[0];if(d==="string")o="string",a=t;else if(d==="boolean")o="bool",a=Uint8Array.from(t);else throw new TypeError(`Invalid element type of data array: ${d}.`)}else{let d=nt.get(t.constructor);if(d===void 0)throw new TypeError(`Unsupported type for tensor data: ${t.constructor}.`);o=d,a=t}if(u===void 0)u=[a.length];else if(!Array.isArray(u))throw new TypeError("A tensor's dims must be a number array");i=u,this.cpuData=a,this.dataLocation="cpu"}let s=vr(i);if(this.cpuData&&s!==this.cpuData.length&&!((o==="uint4"||o==="int4")&&Math.ceil(s/2)===this.cpuData.length))throw new Error(`Tensor's size(${s}) does not match data length(${this.cpuData.length}).`);this.type=o,this.dims=i,this.size=s}static async fromImage(t,n){return fr(t,n)}static fromTexture(t,n){return hr(t,n)}static fromGpuBuffer(t,n){return gr(t,n)}static fromPinnedBuffer(t,n,r){return yr(t,n,r)}toDataURL(t){return cr(this,t)}toImageData(t){return pr(this,t)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}async getData(t){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let n=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=n,t&&this.disposer&&(this.disposer(),this.disposer=void 0),n}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(t){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return xr(this,t)}}});var ce,vt=A(()=>{"use strict";_t();ce=pe});var xt,Ir,$e,fe,yn=A(()=>{"use strict";hn();xt=(e,t)=>{(typeof we.trace>"u"?!we.wasm.trace:!we.trace)||console.timeStamp(`${e}::ORT::${t}`)},Ir=(e,t)=>{let n=new Error().stack?.split(/\r\n|\r|\n/g)||[],r=!1;for(let o=0;o<n.length;o++){if(r&&!n[o].includes("TRACE_FUNC")){let i=`FUNC_${e}::${n[o].trim().split(" ")[1]}`;t&&(i+=`::${t}`),xt("CPU",i);return}n[o].includes("TRACE_FUNC")&&(r=!0)}},$e=e=>{(typeof we.trace>"u"?!we.wasm.trace:!we.trace)||Ir("BEGIN",e)},fe=e=>{(typeof we.trace>"u"?!we.wasm.trace:!we.trace)||Ir("END",e)}});var St,Cr=A(()=>{"use strict";$t();vt();yn();St=class e{constructor(t){this.handler=t}async run(t,n,r){$e();let o={},i={};if(typeof t!="object"||t===null||t instanceof ce||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let s=!0;if(typeof n=="object"){if(n===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(n instanceof ce)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(n)){if(n.length===0)throw new TypeError("'fetches' cannot be an empty array.");s=!1;for(let d of n){if(typeof d!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(d)===-1)throw new RangeError(`'fetches' contains invalid output name: ${d}.`);o[d]=null}if(typeof r=="object"&&r!==null)i=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else{let d=!1,c=Object.getOwnPropertyNames(n);for(let l of this.outputNames)if(c.indexOf(l)!==-1){let p=n[l];(p===null||p instanceof ce)&&(d=!0,s=!1,o[l]=p)}if(d){if(typeof r=="object"&&r!==null)i=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else i=n}}else if(typeof n<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let d of this.inputNames)if(typeof t[d]>"u")throw new Error(`input '${d}' is missing in 'feeds'.`);if(s)for(let d of this.outputNames)o[d]=null;let a=await this.handler.run(t,o,i),u={};for(let d in a)if(Object.hasOwnProperty.call(a,d)){let c=a[d];c instanceof ce?u[d]=c:u[d]=new ce(c.type,c.data,c.dims)}return fe(),u}async release(){return this.handler.dispose()}static async create(t,n,r,o){$e();let i,s={};if(typeof t=="string"){if(i=t,typeof n=="object"&&n!==null)s=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(i=t,typeof n=="object"&&n!==null)s=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let c=t,l=0,p=t.byteLength;if(typeof n=="object"&&n!==null)s=n;else if(typeof n=="number"){if(l=n,!Number.isSafeInteger(l))throw new RangeError("'byteOffset' must be an integer.");if(l<0||l>=c.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${c.byteLength}).`);if(p=t.byteLength-l,typeof r=="number"){if(p=r,!Number.isSafeInteger(p))throw new RangeError("'byteLength' must be an integer.");if(p<=0||l+p>c.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${c.byteLength-l}].`);if(typeof o=="object"&&o!==null)s=o;else if(typeof o<"u")throw new TypeError("'options' must be an object.")}else if(typeof r<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof n<"u")throw new TypeError("'options' must be an object.");i=new Uint8Array(c,l,p)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[a,u]=await wt(s),d=await a.createInferenceSessionHandler(i,u);return fe(),new e(d)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}}});var cu,Tr=A(()=>{"use strict";Cr();cu=St});var Ar=A(()=>{"use strict"});var kr=A(()=>{"use strict"});var Er=A(()=>{"use strict"});var Pr=A(()=>{"use strict"});var pu,It,zr=A(()=>{"use strict";$t();vt();pu="Training backend could not be resolved. Make sure you're using the correct configuration & WebAssembly files.",It=class e{constructor(t,n,r){this.handler=t,this.hasOptimizerModel=n,this.hasEvalModel=r}get trainingInputNames(){return this.handler.inputNames}get trainingOutputNames(){return this.handler.outputNames}get evalInputNames(){if(this.hasEvalModel)return this.handler.evalInputNames;throw new Error("This training session has no evalModel loaded.")}get evalOutputNames(){if(this.hasEvalModel)return this.handler.evalOutputNames;throw new Error("This training session has no evalModel loaded.")}static async create(t,n){let r=t.evalModel||"",o=t.optimizerModel||"",i=n||{},[s,a]=await wt(i);if(s.createTrainingSessionHandler){let u=await s.createTrainingSessionHandler(t.checkpointState,t.trainModel,r,o,a);return new e(u,!!t.optimizerModel,!!t.evalModel)}else throw new Error(pu)}typeNarrowingForRunStep(t,n,r,o,i){let s={},a={};if(typeof r!="object"||r===null||r instanceof ce||Array.isArray(r))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let u=!0;if(typeof o=="object"){if(o===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(o instanceof ce)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(o)){if(o.length===0)throw new TypeError("'fetches' cannot be an empty array.");u=!1;for(let d of o){if(typeof d!="string")throw new TypeError("'fetches' must be a string array or an object.");if(n.indexOf(d)===-1)throw new RangeError(`'fetches' contains invalid output name: ${d}.`);s[d]=null}if(typeof i=="object"&&i!==null)a=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else{let d=!1,c=Object.getOwnPropertyNames(o);for(let l of n)if(c.indexOf(l)!==-1){let p=o[l];(p===null||p instanceof ce)&&(d=!0,u=!1,s[l]=p)}if(d){if(typeof i=="object"&&i!==null)a=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else a=o}}else if(typeof o<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let d of t)if(typeof r[d]>"u")throw new Error(`input '${d}' is missing in 'feeds'.`);if(u)for(let d of n)s[d]=null;return[s,a]}convertHandlerReturnTypeToMapOfTensors(t){let n={};for(let r in t)if(Object.hasOwnProperty.call(t,r)){let o=t[r];o instanceof ce?n[r]=o:n[r]=new ce(o.type,o.data,o.dims)}return n}async lazyResetGrad(){await this.handler.lazyResetGrad()}async runTrainStep(t,n,r){let[o,i]=this.typeNarrowingForRunStep(this.trainingInputNames,this.trainingOutputNames,t,n,r),s=await this.handler.runTrainStep(t,o,i);return this.convertHandlerReturnTypeToMapOfTensors(s)}async runOptimizerStep(t){if(this.hasOptimizerModel)await this.handler.runOptimizerStep(t||{});else throw new Error("This TrainingSession has no OptimizerModel loaded.")}async runEvalStep(t,n,r){if(this.hasEvalModel){let[o,i]=this.typeNarrowingForRunStep(this.evalInputNames,this.evalOutputNames,t,n,r),s=await this.handler.runEvalStep(t,o,i);return this.convertHandlerReturnTypeToMapOfTensors(s)}else throw new Error("This TrainingSession has no EvalModel loaded.")}async getParametersSize(t=!0){return this.handler.getParametersSize(t)}async loadParametersBuffer(t,n=!0){let r=await this.getParametersSize(n);if(t.length!==4*r)throw new Error("Size of the buffer passed into loadParametersBuffer must match the number of parameters in the model. Please use getParametersSize method to check.");return this.handler.loadParametersBuffer(t,n)}async getContiguousParameters(t=!0){return this.handler.getContiguousParameters(t)}async release(){return this.handler.dispose()}}});var mu,Or=A(()=>{"use strict";zr();mu=It});var bn={};yt(bn,{InferenceSession:()=>cu,TRACE:()=>xt,TRACE_FUNC_BEGIN:()=>$e,TRACE_FUNC_END:()=>fe,Tensor:()=>ce,TrainingSession:()=>mu,env:()=>X,registerBackend:()=>We});var Se=A(()=>{"use strict";sr();lr();Tr();vt();Ar();kr();yn();Er();Pr();Or()});var Ct=A(()=>{"use strict"});var Ur={};yt(Ur,{default:()=>fu});var Dr,Rr,fu,Mr=A(()=>{"use strict";wn();Le();rt();Dr="ort-wasm-proxy-worker",Rr=globalThis.self?.name===Dr;Rr&&(self.onmessage=e=>{let{type:t,in:n}=e.data;try{switch(t){case"init-wasm":Tt(n.wasm).then(()=>{At(n).then(()=>{postMessage({type:t})},r=>{postMessage({type:t,err:r})})},r=>{postMessage({type:t,err:r})});break;case"init-ep":{let{epName:r,env:o}=n;kt(o,r).then(()=>{postMessage({type:t})},i=>{postMessage({type:t,err:i})});break}case"copy-from":{let{buffer:r}=n,o=ot(r);postMessage({type:t,out:o});break}case"create":{let{model:r,options:o}=n;Et(r,o).then(i=>{postMessage({type:t,out:i})},i=>{postMessage({type:t,err:i})});break}case"release":Pt(n),postMessage({type:t});break;case"run":{let{sessionId:r,inputIndices:o,inputs:i,outputIndices:s,options:a}=n;zt(r,o,i,s,new Array(s.length).fill(null),a).then(u=>{u.some(d=>d[3]!=="cpu")?postMessage({type:t,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:t,out:u},Bt([...i,...u]))},u=>{postMessage({type:t,err:u})});break}case"end-profiling":Ot(n),postMessage({type:t});break;default:}}catch(r){postMessage({type:t,err:r})}});fu=Rr?null:e=>new Worker(e??Ie,{type:"module",name:Dr})});var Ie,hu,Nr,gu,yu,Wr,bu,Vr,Gr,Lr,rt=A(()=>{"use strict";Ct();Ie=!1?void 0:import.meta.url??(typeof document<"u"?document.currentScript?.src:typeof self<"u"?self.location?.href:void 0),hu=!1||typeof location>"u"?void 0:location.origin,Nr=(e,t)=>{try{let n=t??Ie;return(n?new URL(e,n):new URL(e)).origin===hu}catch{return!1}},gu=(e,t)=>{let n=t??Ie;try{return(n?new URL(e,n):new URL(e)).href}catch{return}},yu=(e,t)=>`${t??"./"}${e}`,Wr=async e=>{let n=await(await fetch(e,{credentials:"same-origin"})).blob();return URL.createObjectURL(n)},bu=async e=>(await import(/*webpackIgnore:true*/e)).default,Vr=(Mr(),fn(Ur)).default,Gr=async()=>{if(!Ie)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(Nr(Ie))return[void 0,Vr()];let e=await Wr(Ie);return[e,Vr(e)]},Lr=async(e,t,n)=>{{let r="ort-wasm-simd-threaded.jsep.mjs",o=e??gu(r,t),i=!!1&&n&&o&&!Nr(o,t),s=i?await Wr(o):o??yu(r,t);return[i?s:void 0,await bu(s)]}}});var $n,_n,Dt,Hr,wu,$u,Tt,se,Le=A(()=>{"use strict";rt();_n=!1,Dt=!1,Hr=!1,wu=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},$u=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Tt=async e=>{if(_n)return Promise.resolve();if(Dt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Hr)throw new Error("previous call to 'initializeWebAssembly()' failed.");Dt=!0;let t=e.initTimeout,n=e.numThreads;if(!$u())throw new Error("WebAssembly SIMD is not supported in the current environment.");let r=wu();n>1&&!r&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+n+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=n=1);let o=e.wasmPaths,i=typeof o=="string"?o:void 0,s=o?.mjs,a=s?.href??s,u=o?.wasm,d=u?.href??u,c=e.wasmBinary,[l,p]=await Lr(a,i,n>1),f=!1,m=[];if(t>0&&m.push(new Promise(h=>{setTimeout(()=>{f=!0,h()},t)})),m.push(new Promise((h,y)=>{let w={numThreads:n};c?w.wasmBinary=c:(d||i)&&(w.locateFile=(g,b)=>d??(i??b)+g),p(w).then(g=>{Dt=!1,_n=!0,$n=g,h(),l&&URL.revokeObjectURL(l)},g=>{Dt=!1,Hr=!0,y(g)})})),await Promise.race(m),f)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},se=()=>{if(_n&&$n)return $n;throw new Error("WebAssembly is not initialized yet.")}});var ue,it,oe,Rt=A(()=>{"use strict";Le();ue=(e,t)=>{let n=se(),r=n.lengthBytesUTF8(e)+1,o=n._malloc(r);return n.stringToUTF8(e,o,r),t.push(o),o},it=(e,t,n,r)=>{if(typeof e=="object"&&e!==null){if(n.has(e))throw new Error("Circular reference in options");n.add(e)}Object.entries(e).forEach(([o,i])=>{let s=t?t+o:o;if(typeof i=="object")it(i,s+".",n,r);else if(typeof i=="string"||typeof i=="number")r(s,i.toString());else if(typeof i=="boolean")r(s,i?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof i}`)})},oe=e=>{let t=se(),n=t.stackSave();try{let r=t.stackAlloc(8);t._OrtGetLastError(r,r+4);let o=t.HEAP32[r/4],i=t.HEAPU32[r/4+1],s=i?t.UTF8ToString(i):"";throw new Error(`${e} ERROR_CODE: ${o}, ERROR_MESSAGE: ${s}`)}finally{t.stackRestore(n)}}});var qr,Fr=A(()=>{"use strict";Le();Rt();qr=e=>{let t=se(),n=0,r=[],o=e||{};try{if(e?.logSeverityLevel===void 0)o.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${e.logSeverityLevel}`);if(e?.logVerbosityLevel===void 0)o.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);e?.terminate===void 0&&(o.terminate=!1);let i=0;return e?.tag!==void 0&&(i=ue(e.tag,r)),n=t._OrtCreateRunOptions(o.logSeverityLevel,o.logVerbosityLevel,!!o.terminate,i),n===0&&oe("Can't create run options."),e?.extra!==void 0&&it(e.extra,"",new WeakSet,(s,a)=>{let u=ue(s,r),d=ue(a,r);t._OrtAddRunConfigEntry(n,u,d)!==0&&oe(`Can't set a run config entry: ${s} - ${a}.`)}),[n,r]}catch(i){throw n!==0&&t._OrtReleaseRunOptions(n),r.forEach(s=>t._free(s)),i}}});var _u,vu,xu,Su,Kr,jr=A(()=>{"use strict";Le();Rt();_u=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},vu=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},xu=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(n=>(typeof n=="string"?n:n.name)==="webgpu")&&(e.enableMemPattern=!1)},Su=(e,t,n)=>{for(let r of t){let o=typeof r=="string"?r:r.name;switch(o){case"webnn":if(o="WEBNN",typeof r!="string"){let a=r?.deviceType;if(a){let u=ue("deviceType",n),d=ue(a,n);se()._OrtAddSessionConfigEntry(e,u,d)!==0&&oe(`Can't set a session config entry: 'deviceType' - ${a}.`)}}break;case"webgpu":if(o="JS",typeof r!="string"){let s=r;if(s?.preferredLayout){if(s.preferredLayout!=="NCHW"&&s.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${s.preferredLayout}`);let a=ue("preferredLayout",n),u=ue(s.preferredLayout,n);se()._OrtAddSessionConfigEntry(e,a,u)!==0&&oe(`Can't set a session config entry: 'preferredLayout' - ${s.preferredLayout}.`)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${o}`)}let i=ue(o,n);se()._OrtAppendExecutionProvider(e,i)!==0&&oe(`Can't append execution provider: ${o}.`)}},Kr=e=>{let t=se(),n=0,r=[],o=e||{};xu(o);try{let i=_u(o.graphOptimizationLevel??"all"),s=vu(o.executionMode??"sequential"),a=typeof o.logId=="string"?ue(o.logId,r):0,u=o.logSeverityLevel??2;if(!Number.isInteger(u)||u<0||u>4)throw new Error(`log serverity level is not valid: ${u}`);let d=o.logVerbosityLevel??0;if(!Number.isInteger(d)||d<0||d>4)throw new Error(`log verbosity level is not valid: ${d}`);let c=typeof o.optimizedModelFilePath=="string"?ue(o.optimizedModelFilePath,r):0;if(n=t._OrtCreateSessionOptions(i,!!o.enableCpuMemArena,!!o.enableMemPattern,s,!!o.enableProfiling,0,a,u,d,c),n===0&&oe("Can't create session options."),o.executionProviders&&Su(n,o.executionProviders,r),o.enableGraphCapture!==void 0){if(typeof o.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${o.enableGraphCapture}`);let l=ue("enableGraphCapture",r),p=ue(o.enableGraphCapture.toString(),r);t._OrtAddSessionConfigEntry(n,l,p)!==0&&oe(`Can't set a session config entry: 'enableGraphCapture' - ${o.enableGraphCapture}.`)}if(o.freeDimensionOverrides)for(let[l,p]of Object.entries(o.freeDimensionOverrides)){if(typeof l!="string")throw new Error(`free dimension override name must be a string: ${l}`);if(typeof p!="number"||!Number.isInteger(p)||p<0)throw new Error(`free dimension override value must be a non-negative integer: ${p}`);let f=ue(l,r);t._OrtAddFreeDimensionOverride(n,f,p)!==0&&oe(`Can't set a free dimension override: ${l} - ${p}.`)}return o.extra!==void 0&&it(o.extra,"",new WeakSet,(l,p)=>{let f=ue(l,r),m=ue(p,r);t._OrtAddSessionConfigEntry(n,f,m)!==0&&oe(`Can't set a session config entry: ${l} - ${p}.`)}),[n,r]}catch(i){throw n!==0&&t._OrtReleaseSessionOptions(n),r.forEach(s=>t._free(s)),i}}});var vn,Ue,st,Ut,at,Mt,xn,R=A(()=>{"use strict";vn=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},Ue=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},st=(e,t)=>{let n=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],r=typeof t=="number"?t:t.reduce((o,i)=>o*i,1);return n>0?Math.ceil(r*n):void 0},Ut=e=>{switch(e){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},at=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},Mt=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",xn=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;default:throw new Error(`unsupported data location: ${e}`)}}});var ut,Sn=A(()=>{"use strict";Ct();ut=async e=>{if(typeof e=="string")if(!1)try{let{readFile:t}=mn("node:fs/promises");return new Uint8Array(await t(e))}catch(t){if(t.code==="ERR_FS_FILE_TOO_LARGE"){let{createReadStream:n}=mn("node:fs"),r=n(e),o=[];for await(let i of r)o.push(i);return new Uint8Array(Buffer.concat(o))}throw t}else{let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let n=t.headers.get("Content-Length"),r=n?parseInt(n,10):0;if(r<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let o=t.body.getReader(),i;try{i=new ArrayBuffer(r)}catch(a){if(a instanceof RangeError){let u=Math.ceil(r/65536);i=new WebAssembly.Memory({initial:u,maximum:u}).buffer}else throw a}let s=0;for(;;){let{done:a,value:u}=await o.read();if(a)break;let d=u.byteLength;new Uint8Array(i,s,d).set(u),s+=d}return new Uint8Array(i,0,r)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}});var Iu,Cu,Zr,Xr,Qr,Tu,J,De=A(()=>{"use strict";R();Iu=["V","I","W","E","F"],Cu=(e,t)=>{console.log(`[${Iu[e]},${new Date().toISOString()}]${t}`)},Qr=(e,t)=>{Zr=e,Xr=t},Tu=(e,t)=>{let n=at(e),r=at(Zr);n>=r&&Cu(n,typeof t=="function"?t():t)},J=(...e)=>{Xr&&Tu(...e)}});var Yr,Jr=A(()=>{"use strict";R();Yr=(e,t)=>new(Ut(t))(e)});var Vt=A(()=>{"use strict"});var eo,In,Cn,Au,ku,to,An,Tn,ro,oo=A(()=>{"use strict";De();Vt();eo=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),In=[],Cn=e=>Math.ceil(e/16)*16,Au=e=>{for(let t=0;t<In.length;t++){let n=In[t];if(e<=n)return n}return Math.ceil(e/16)*16},ku=1,to=()=>ku++,An=async(e,t,n,r)=>{let o=Cn(n),i=e.device.createBuffer({size:o,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let s=e.getCommandEncoder();e.endComputePass(),s.copyBufferToBuffer(t,0,i,0,o),e.flush(),await i.mapAsync(GPUMapMode.READ);let a=i.getMappedRange();if(r){let u=r();return u.set(new Uint8Array(a,0,n)),u}else return new Uint8Array(a.slice(0,n))}finally{i.destroy()}},Tn=class{constructor(t){this.backend=t;this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersForUploadingPending=[],this.buffersPending=[],this.externalBuffers=new Map,this.capturedPendingBuffers=new Map;for(let[n]of eo)In.push(n),this.freeBuffers.set(n,[]),this.freeUniformBuffers.set(n,[])}upload(t,n){let r=n.buffer,o=n.byteOffset,i=n.byteLength,s=Cn(i),a=this.storageCache.get(t);if(!a)throw new Error("gpu data for uploading does not exist");if(a.originalSize!==i)throw new Error(`inconsistent data size. gpu data size=${a.originalSize}, data size=${i}`);let u=this.backend.device.createBuffer({mappedAtCreation:!0,size:s,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),d=u.getMappedRange();new Uint8Array(d).set(new Uint8Array(r,o,i)),u.unmap();let c=this.backend.getCommandEncoder();this.backend.endComputePass(),c.copyBufferToBuffer(u,0,a.gpuData.buffer,0,s),J("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${t})`),this.buffersForUploadingPending.push(u)}memcpy(t,n){let r=this.storageCache.get(t);if(!r)throw new Error("source gpu data for memcpy does not exist");let o=this.storageCache.get(n);if(!o)throw new Error("destination gpu data for memcpy does not exist");if(r.originalSize!==o.originalSize)throw new Error("inconsistent source and destination gpu data size");let i=Cn(r.originalSize),s=this.backend.getCommandEncoder();this.backend.endComputePass(),s.copyBufferToBuffer(r.gpuData.buffer,0,o.gpuData.buffer,0,i)}registerExternalBuffer(t,n,r){let o;if(r){if(o=this.externalBuffers.get(r),o===void 0)throw new Error("previous buffer is not registered");if(t===r)return J("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${n}) => id=${o}, buffer is the same, skip.`),o;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`);this.externalBuffers.delete(r)}else o=to();return this.storageCache.set(o,{gpuData:{id:o,type:0,buffer:t},originalSize:n}),this.externalBuffers.set(t,o),J("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${n}) => id=${o}, registered.`),o}unregisterExternalBuffer(t){let n=this.externalBuffers.get(t);n!==void 0&&(this.storageCache.delete(n),this.externalBuffers.delete(t),J("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${n}`))}create(t,n=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let r=Au(t),o,i=(n&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,s=(n&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(i||s){let d=(i?this.freeBuffers:this.freeUniformBuffers).get(r);d?d.length>0?o=d.pop():o=this.backend.device.createBuffer({size:r,usage:n}):o=this.backend.device.createBuffer({size:r,usage:n})}else o=this.backend.device.createBuffer({size:r,usage:n});let a={id:to(),type:0,buffer:o};return this.storageCache.set(a.id,{gpuData:a,originalSize:t}),J("verbose",()=>`[WebGPU] GpuDataManager.create(size=${t}) => id=${a.id}`),a}get(t){return this.storageCache.get(t)?.gpuData}release(t){let n=this.storageCache.get(t);if(!n)throw new Error("releasing data does not exist");return J("verbose",()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${n.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(n.gpuData.buffer),n.originalSize}async download(t,n){let r=this.storageCache.get(t);if(!r)throw new Error("data does not exist");await An(this.backend,r.gpuData.buffer,r.originalSize,n)}refreshPendingBuffers(){for(let t of this.buffersForUploadingPending)t.destroy();if(this.buffersForUploadingPending=[],this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let t of this.buffersPending){let n=eo.get(t.size);if((t.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let r=this.freeBuffers.get(t.size)||[];n===void 0||r.length>=n?t.destroy():r.push(t)}else if((t.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let r=this.freeUniformBuffers.get(t.size)||[];n===void 0||r.length>=n?t.destroy():r.push(t)}else t.destroy()}this.buffersPending=[]}else{let t=this.capturedPendingBuffers.get(this.backend.currentSessionId);t||(t=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,t));for(let n of this.buffersPending)t.push(n);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(t=>{t.forEach(n=>{n.destroy()})}),this.freeUniformBuffers.forEach(t=>{t.forEach(n=>{n.destroy()})}),this.storageCache.forEach(t=>{t.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(t=>{t.forEach(n=>{n.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onReleaseSession(t){let n=this.capturedPendingBuffers.get(t);n&&(n.forEach(r=>{r.destroy()}),this.capturedPendingBuffers.delete(t))}},ro=(...e)=>new Tn(...e)});var kn,M,ie=A(()=>{"use strict";kn=class{constructor(t){Object.assign(this,t)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(t=>`${this[t]}`).join(";")),this.key}},M=e=>new kn(e)});var En,ke,v,qe,Nt,Wt,Gt,N=A(()=>{"use strict";En=class{static calcMatMulShape(t,n){return t[1]!==n[0]?void 0:[t[0],n[1]]}},ke=class{static calcShape(t,n,r=!1){let o=t.length,i=n.length;if(o===0)return n;if(i===0)return t;let s=Math.max(t.length,n.length),a=new Array(s);if(r){if(o<2||i<2)return;let u=En.calcMatMulShape([t[o-2],t[o-1]],[n[i-2],n[i-1]]);if(u===void 0)return;[a[s-2],a[s-1]]=u}for(let u=r?3:1;u<=s;u++){let d=o-u<0?1:t[o-u],c=i-u<0?1:n[i-u];if(d!==c&&d>1&&c>1)return;let l=Math.max(d,c);if(d&&c)a[s-u]=Math.max(d,c);else{if(l>1)return;a[s-u]=0}}return a}static isValidBroadcast(t,n){let r=t.length,o=n.length;if(r>o)return!1;for(let i=1;i<=r;i++)if(t[r-i]!==1&&t[r-i]!==n[o-i])return!1;return!0}},v=class e{static size(t){return e.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,n=4){let r=t.length;if(r===0)return[];let o=new Array(r),i=r-1;for(;i>=0;){if(t[i]%n===0){o[i]=t[i]/n;break}if(n%t[i]!==0)throw new Error("cannot convert shape");o[i]=1,n/=t[i],i--}for(i--;i>=0;i--)o[i]=t[i];return o}static sizeFromDimension(t,n){if(n<0||n>t.length)throw new Error(`invalid dimension of ${n} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return e.getSizeFromDimensionRange(t,n,t.length)}static sizeToDimension(t,n){if(n<0||n>t.length)throw new Error(`invalid dimension of ${n} for sizeToDimension as Tensor has ${t.length} dimensions.`);return e.getSizeFromDimensionRange(t,0,n)}static getSizeFromDimensionRange(t,n,r){let o=1;for(let i=n;i<r;i++){if(t[i]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");o*=t[i]}return o}static computeStrides(t){let n=t.length;if(n===0)return[];if(n===1)return[1];let r=new Array(n);r[n-1]=1,r[n-2]=t[n-1];for(let o=n-3;o>=0;--o)r[o]=r[o+1]*t[o+1];return r}static normalizeAxis(t,n){if(t<-n&&t>=n)throw new Error("unsupported axis for this operation.");return t<0?t+n:t}static normalizeAxes(t,n){return t.map(r=>this.normalizeAxis(r,n??t.length))}static sortBasedOnPerm(t,n){return n?n.map(r=>t[r]):t.slice().reverse()}static padShape(t,n){let r=t.length;return t.map((o,i)=>o+n[i]+n[i+r])}static areEqual(t,n){return t.length!==n.length?!1:t.every((r,o)=>r===n[o])}},qe=class e{static adjustPoolAttributes(t,n,r,o,i,s){if(!t&&r.length!==n.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let a=0;a<n.length-2;a++)a>=r.length?r.push(n[a+2]):r[a]=n[a+2];for(let a=0;a<r.length;a++)if(a<o.length){if(o[a]<0)throw new Error("strides should be greater than or equal to 1")}else o.push(1);for(let a=0;a<r.length;a++)if(a<i.length){if(i[a]<0)throw new Error("dilations should be greater than or equal to 1")}else i.push(1);for(let a=0;a<r.length*2;a++)if(a<s.length){if(s[a]<0)throw new Error("pad should be greater than or equal to 1")}else s.push(0);for(let a=0;a<r.length;a++){if(r[a]<=0)throw new Error("kernel shapes need to be greater than 0");if(s[a]>=r[a]||s[a+r.length]>=r[a])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,n,r,o,i,s,a){if(a){if(i.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(n.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(o.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let u=0;u<t.length-2;u++)e.adjustPadAndReturnShape(t[u+(s?1:2)],n[u],r[u],o[u],i,u,u+t.length-2,a)}}static computePoolOutputShape(t,n,r,o,i,s,a){if(n.length<=0)throw new Error("input shape must be of size greater than 0");let u=[n[0],n[1]];return e.computeShapeHelper(t,n,u,r,o,i,s,a),u}static computeConvOutputShape(t,n,r,o,i,s,a){if(t.length<=0||n.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let u=[t[0],n[0]];return e.computeShapeHelper(!1,t,u,r,o,i,s,a),u}static computeShapeHelper(t,n,r,o,i,s,a,u){if(t)for(let d=0;d<n.length-2;d++)r.push(1);else for(let d=0;d<n.length-2;d++)r.push(e.adjustPadAndReturnShape(n[d+2],o[d],i[d],s[d],a,d,d+n.length-2,u))}static adjustPadAndReturnShape(t,n,r,o,i,s,a,u){let d=r*(o-1)+1;if(u&&u!=="NOTSET")switch(u){case"VALID":return i[s]=0,i[a]=0,Math.floor((t-d)/n+1);case"SAME_LOWER":case"SAME_UPPER":if(r!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let l=((t+n-1)/n-1)*n+o-t;return i[s]=Math.floor(u==="SAME_LOWER"?(l+1)/2:l/2),i[a]=l-i[s],Math.floor((t+l-o)/n+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+i[s]+i[a]-d)/n+1)}},Nt=class{static getShapeOfGemmResult(t,n,r,o,i){if(t.length!==2||r.length!==2)throw new Error("shape need to be of size 2");let s,a,u;n?(s=t[1],a=t[0]):(s=t[0],a=t[1]);let d=-1;if(o?(u=r[0],d=1):(u=r[1],d=0),r[d]!==a)throw new Error("dimension mismatch");if(s<=0||u<=0||a<=0)throw new Error("invalid shape specified");if(i&&!ke.isValidBroadcast(i,[s,u]))throw new Error("gemm: invalid bias shape for broadcast");return[s,u,a]}},Wt=-34028234663852886e22,Gt=34028234663852886e22});var Fe,zn,Q,de,E,ee,Me,Ke,Ae,O,On,S,C,Lt,Pn,io,Ye,G=A(()=>{"use strict";R();N();Fe=64,zn=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(e){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},Q=(e,t=1)=>{let n=zn(e,t);return typeof n=="string"?n:n[0]},de=(e,t=1)=>{let n=zn(e,t);return typeof n=="string"?n:n[1]},E=(...e)=>{let t=[];return e.forEach(n=>{n.length!==0&&t.push({type:12,data:n},{type:12,data:v.computeStrides(n)})}),t},ee=e=>e%4===0?4:e%2===0?2:1,Me=(e="f32",t,n="0")=>!t||t===1?`${e}(${n})`:`vec${t}<${e}>(${n})`,Ke=(e,t,n)=>e==="f32"?n:t===1?`f32(${n})`:`vec${t}<f32>(${n})`,Ae=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,O=(e,t,n,r)=>e.startsWith("uniforms.")&&n>4?typeof t=="string"?r==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:r==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:n>1?`${e}[${t}]`:e,On=(e,t,n,r,o)=>{let i=typeof n=="number",s=i?n:n.length,a=[...new Array(s).keys()],u=s<2?"u32":s<=4?`vec${s}<u32>`:`array<u32, ${s}>`,d=zn(t,o),c=typeof d=="string"?d:d[1],l=typeof d=="string"?d:d[0],p={indices:u,value:c,storage:l,tensor:t},f=k=>typeof k=="string"?k:`${k}u`,m={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},h=i?"uniforms.":"",y=`${h}${e}_shape`,w=`${h}${e}_strides`,g="";for(let k=0;k<s-1;k++)g+=`
    let dim${k} = current / ${O(w,k,s)};
    let rest${k} = current % ${O(w,k,s)};
    indices[${k}] = dim${k};
    current = rest${k};
    `;g+=`indices[${s-1}] = current;`;let b=s<2?"":`
  fn o2i_${e}(offset: u32) -> ${p.indices} {
    var indices: ${p.indices};
    var current = offset;
    ${g}
    return indices;
  }`,$=k=>(m.offsetToIndices=!0,s<2?k:`o2i_${e}(${k})`),_=[];if(s>=2)for(let k=s-1;k>=0;k--)_.push(`${O(w,k,s)} * (indices[${k}])`);let x=s<2?"":`
  fn i2o_${e}(indices: ${p.indices}) -> u32 {
    return ${_.join("+")};
  }`,I=k=>(m.indicesToOffset=!0,s<2?k:`i2o_${e}(${k})`),T=(...k)=>s===0?"0u":`${p.indices}(${k.map(f).join(",")})`,P=(k,B)=>s<2?`${k}`:`${O(k,B,s)}`,z=(k,B,Y)=>s<2?`${k}=${Y};`:`${O(k,B,s)}=${Y};`,D={},j=(k,B)=>{m.broadcastedIndicesToOffset=!0;let Y=`${B.name}broadcastedIndicesTo${e}Offset`;if(Y in D)return`${Y}(${k})`;let Te=[];for(let me=s-1;me>=0;me--){let Ve=B.indicesGet("outputIndices",me+B.rank-s);Te.push(`${P(w,me)} * (${Ve} % ${P(y,me)})`)}return D[Y]=`fn ${Y}(outputIndices: ${B.type.indices}) -> u32 {
             return ${Te.length>0?Te.join("+"):"0u"};
           }`,`${Y}(${k})`},L=(k,B)=>(()=>{if(p.storage===p.value)return`${e}[${k}]=${B};`;if(p.storage==="vec2<u32>"&&p.value==="i32")return`${e}[${k}]=vec2<u32>(u32(${B}), select(0u, 0xFFFFFFFFu, ${B} < 0));`;if(p.storage==="vec2<u32>"&&p.value==="u32")return`${e}[${k}]=vec2<u32>(u32(${B}), 0u);`;if(p.storage==="u32"&&p.value==="vec4<bool>")return`${e}[${k}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${B}));`;throw new Error(`not supported combination of storage type ${p.storage} and value type ${p.value} yet`)})(),q=k=>(()=>{if(p.storage===p.value)return`${e}[${k}]`;if(p.storage==="vec2<u32>"&&p.value==="i32")return`i32(${e}[${k}].x)`;if(p.storage==="vec2<u32>"&&p.value==="u32")return`u32(${e}[${k}].x)`;if(p.storage==="u32"&&p.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${k}] & 0xFFu), bool(${e}[${k}] & 0xFF00u), bool(${e}[${k}] & 0xFF0000u), bool(${e}[${k}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${p.storage} and value type ${p.value} yet`)})(),ae=s<2?"":`
  fn get_${e}ByIndices(indices: ${p.indices}) -> ${c} {
    return ${q(`i2o_${e}(indices)`)};
  }`,U=s<2?"":(()=>{let k=a.map(Y=>`d${Y}: u32`).join(", "),B=a.map(Y=>`d${Y}`).join(", ");return`
  fn get_${e}(${k}) -> ${c} {
    return get_${e}ByIndices(${T(B)});
  }`})(),te=(...k)=>{if(k.length!==s)throw new Error(`indices length must be ${s}`);let B=k.map(f).join(",");return s===0?q("0u"):s===1?q(B[0]):(m.get=!0,m.getByIndices=!0,m.indicesToOffset=!0,`get_${e}(${B})`)},re=k=>s<2?q(k):(m.getByIndices=!0,m.indicesToOffset=!0,`get_${e}ByIndices(${k})`),V=s<2?"":`
  fn set_${e}ByIndices(indices: ${p.indices}, value: ${c}) {
    ${L(`i2o_${e}(indices)`,"value")}
  }`,ne=s<2?"":(()=>{let k=a.map(Y=>`d${Y}: u32`).join(", "),B=a.map(Y=>`d${Y}`).join(", ");return`
  fn set_${e}(${k}, value: ${c}) {
    set_${e}ByIndices(${T(B)}, value);
  }`})();return{impl:()=>{let k=[],B=!1;return m.offsetToIndices&&(k.push(b),B=!0),m.indicesToOffset&&(k.push(x),B=!0),m.broadcastedIndicesToOffset&&(Object.values(D).forEach(Y=>k.push(Y)),B=!0),m.set&&(k.push(ne),B=!0),m.setByIndices&&(k.push(V),B=!0),m.get&&(k.push(U),B=!0),m.getByIndices&&(k.push(ae),B=!0),!i&&B&&k.unshift(`const ${y} = ${p.indices}(${n.join(",")});`,`const ${w} = ${p.indices}(${v.computeStrides(n).join(",")});`),k.join(`
`)},type:p,offsetToIndices:$,indicesToOffset:I,broadcastedIndicesToOffset:j,indices:T,indicesGet:P,indicesSet:z,set:(...k)=>{if(k.length!==s+1)throw new Error(`indices length must be ${s}`);let B=k[s];if(typeof B!="string")throw new Error("value must be string");let Y=k.slice(0,s).map(f).join(",");return s===0?L("0u",B):s===1?L(Y[0],B):(m.set=!0,m.setByIndices=!0,m.indicesToOffset=!0,`set_${e}(${Y}, ${B})`)},setByOffset:L,setByIndices:(k,B)=>s<2?L(k,B):(m.setByIndices=!0,m.indicesToOffset=!0,`set_${e}ByIndices(${k}, ${B});`),get:te,getByOffset:q,getByIndices:re,usage:r,name:e,strides:w,shape:y,rank:s}},S=(e,t,n,r=1)=>On(e,t,n,"input",r),C=(e,t,n,r=1)=>On(e,t,n,"output",r),Lt=(e,t,n,r=1)=>On(e,t,n,"internal",r),Pn=class{constructor(t,n){this.normalizedDispatchGroup=t;this.limits=n;this.internalVariables=[];this.variables=[];this.uniforms=[];this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(t){return`if (global_idx >= ${typeof t=="number"?`${t}u`:t}) { return; }`}mainStart(t=Fe){let n=typeof t=="number"?t:t[0],r=typeof t=="number"?1:t[1],o=typeof t=="number"?1:t[2];if(n>this.limits.maxComputeWorkgroupSizeX||r>this.limits.maxComputeWorkgroupSizeY||o>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${n}, ${r}, ${o}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(n*r*o>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${n}, ${r}, ${o}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let i=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,s=i?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,a=i?"let global_idx = global_id.x; let local_idx = local_id.x;":`let global_idx = (workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
          workgroup_id.y * num_workgroups[0] + workgroup_id.x) * ${n*r*o}u + local_idx;`;return`@compute @workgroup_size(${n}, ${r}, ${o})
  fn main(${s}) {
    ${a}
  `}appendVariableUniforms(t){t.rank!==0&&(t.shape.startsWith("uniforms.")&&this.uniforms.push({name:t.shape.replace("uniforms.",""),type:"u32",length:t.rank}),t.strides.startsWith("uniforms.")&&this.uniforms.push({name:t.strides.replace("uniforms.",""),type:"u32",length:t.rank}))}declareVariable(t,n){if(t.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(t),this.appendVariableUniforms(t);let r=t.usage==="input"?"read":"read_write",o=t.type.storage;return`@group(0) @binding(${n}) var<storage, ${r}> ${t.name}: array<${o}>;`}declareVariables(...t){return t.map(n=>this.declareVariable(n,this.variableIndex++)).join(`
`)}registerInternalVariable(t){if(t.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(t),this.appendVariableUniforms(t)}registerInternalVariables(...t){return t.forEach(n=>this.registerInternalVariable(n)),this}registerUniform(t,n,r=1){return this.uniforms.push({name:t,type:n,length:r}),this}registerUniforms(t){return this.uniforms=this.uniforms.concat(t),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let t=[];for(let{name:n,type:r,length:o}of this.uniforms)if(o&&o>4)r==="f16"?t.push(`@align(16) ${n}:array<mat2x4<${r}>, ${Math.ceil(o/8)}>`):t.push(`${n}:array<vec4<${r}>, ${Math.ceil(o/4)}>`);else{let i=o==null||o===1?r:`vec${o}<${r}>`;t.push(`${n}:${i}`)}return`
      struct Uniforms { ${t.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(t=>t.impl()).join(`
`)+this.internalVariables.map(t=>t.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let t=n=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(n)];return this.uniforms.map(n=>[t(n.type),n.length??1])}},io=(e,t)=>new Pn(e,t),Ye=(e,t)=>{let n=e.length,r=[];for(let o=0;o<n;o++){let i=n-1-o,s=e[i]||1;(t[t.length-1-o]||1)>1&&s===1&&r.unshift(i)}return r}});var Eu,so,Pu,zu,he,ao,uo,je=A(()=>{"use strict";R();N();ie();G();Eu=e=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.")},so=(e,t)=>t&&t.length!==e?[...new Array(e).keys()].reverse():t,Pu=(e,t)=>v.sortBasedOnPerm(e,so(e.length,t)),zu=(e,t,n,r)=>{let o=[];o.push(`fn perm(i: ${r.type.indices}) -> ${n.type.indices} {
    var a: ${n.type.indices};`);for(let i=0;i<t;++i)o.push(n.indicesSet("a",e[i],`i[${i}]`));return o.push("return a;}"),o.join(`
`)},he=(e,t)=>{let n=e.dataType,r=e.dims.length,o=so(r,t),i=Pu(e.dims,o),s=C("output",n,i.length),a=S("a",n,r),u;if(o.length===2&&o[0]===1&&o[1]===0){let d=s.type.value,c=[16,16,1];u=l=>`
  ${l.registerUniform("output_size","u32").declareVariables(a,s)}
  var<workgroup> tile : array<array<${d}, ${c[0]+1}>, ${c[0]}>;
  ${l.mainStart(c)}
    var x = workgroup_id.x * ${c[0]}u + local_id.x;
    var y = workgroup_id.y * ${c[0]}u + local_id.y;
    let width = uniforms.output_shape[0];
    let height = uniforms.output_shape[1];
    if (x < width && y < height) {
      tile[local_id.y][local_id.x] = ${a.getByOffset("y * width + x")};
    }
    workgroupBarrier();
    x = workgroup_id.y * ${c[0]}u + local_id.x;
    y = workgroup_id.x * ${c[0]}u + local_id.y;
    if (x < height && y < width) {
      ${s.setByOffset("y * height + x","tile[local_id.x][local_id.y]")}
    }
  }`}else u=d=>`
  ${d.registerUniform("output_size","u32").declareVariables(a,s)}

  ${zu(o,r,a,s)}

  ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${s.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${s.setByOffset("global_idx",a.getByIndices("aIndices"))}
  }`;return{name:"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let d=v.size(i);return{outputs:[{dims:i,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:[{type:12,data:d},...E(e.dims,i)]}},getShaderSource:u}},ao=(e,t)=>{Eu(e.inputs),e.compute(he(e.inputs[0],t.perm))},uo=e=>M({perm:e.perm})});var Ou,Bu,Du,Ru,Uu,Mu,Vu,Nu,Wu,Gu,Ee,lo,co,po,mo,fo,ho,go,yo,bo,wo,$o=A(()=>{"use strict";R();N();G();Ht();je();Ou={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},Bu={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},Du={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},Ru={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},Uu=(e,t)=>{let n=[];for(let r=t-e;r<t;++r)n.push(r);return n},Mu=(e,t)=>{let n=[],r=e.length;for(let i=0;i<r;i++)t.indexOf(i)===-1&&n.push(e[i]);let o=t.map(i=>e[i]);return[n,o]},Vu=(e,t)=>{let n=e.length+t.length,r=[],o=0;for(let i=0;i<n;i++)t.indexOf(i)===-1?r.push(e[o++]):r.push(1);return r},Nu=(e,t)=>{for(let n=0;n<e.length;++n)if(e[e.length-n-1]!==t-1-n)return!1;return!0},Wu=(e,t)=>{let n=[];if(!Nu(e,t)){for(let r=0;r<t;++r)e.indexOf(r)===-1&&n.push(r);e.forEach(r=>n.push(r))}return n},Gu=(e,t,n,r,o,i,s)=>{let a=n[0].dims,u=v.size(i),d=v.size(s),c=S("_A",n[0].dataType,a),l=C("output",o,i),p=32,f=`
          var<workgroup> aBestValues : array<f32, ${p}>;
       `;return{name:e,shaderCache:t,getShaderSource:h=>`
        ${h.registerUniform("reduceSize","u32").declareVariables(c,l)}
        ${f}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${h.mainStart(p)}

          let outputIndex = global_idx / ${p};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${Du[r]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${p}) {
           let candidate = f32(${c.getByOffset("offset + k")});
           bestValue = ${Ou[r]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${p}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${Bu[r]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${l.setByOffset("outputIndex",`${r==="mean"?`${l.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${l.type.storage}(${Ru[r]})`}`)};
         }
        }`,getRunData:()=>({outputs:[{dims:i,dataType:o}],dispatchGroup:{x:u},programUniforms:[{type:12,data:d}]})}},Ee=(e,t,n,r)=>{let o=e.inputs.length===1?n:Bn(e.inputs,n),i=o.axes;i.length===0&&!o.noopWithEmptyAxes&&(i=e.inputs[0].dims.map((f,m)=>m));let s=v.normalizeAxes(i,e.inputs[0].dims.length),a=s,u=e.inputs[0],d=Wu(a,e.inputs[0].dims.length);d.length>0&&(u=e.compute(he(e.inputs[0],d),{inputs:[0],outputs:[-1]})[0],a=Uu(a.length,u.dims.length));let[c,l]=Mu(u.dims,a),p=c;o.keepDims&&(p=Vu(c,s)),e.compute(Gu(t,{hint:o.cacheKey,inputDependencies:["type"]},[u],r,e.inputs[0].dataType,p,l),{inputs:[u]})},lo=(e,t)=>{Ee(e,"ReduceMeanShared",t,"mean")},co=(e,t)=>{Ee(e,"ReduceL1Shared",t,"l1")},po=(e,t)=>{Ee(e,"ReduceL2Shared",t,"l2")},mo=(e,t)=>{Ee(e,"ReduceLogSumExpShared",t,"logSumExp")},fo=(e,t)=>{Ee(e,"ReduceMaxShared",t,"max")},ho=(e,t)=>{Ee(e,"ReduceMinShared",t,"min")},go=(e,t)=>{Ee(e,"ReduceProdShared",t,"prod")},yo=(e,t)=>{Ee(e,"ReduceSumShared",t,"sum")},bo=(e,t)=>{Ee(e,"ReduceSumSquareShared",t,"sumSquare")},wo=(e,t)=>{Ee(e,"ReduceLogSumShared",t,"logSum")}});var Pe,Lu,qt,Bn,ze,Hu,qu,Fu,Ku,ju,Zu,Xu,Qu,Yu,Ju,Oe,_o,vo,xo,So,Io,Co,To,Ao,ko,Eo,Ht=A(()=>{"use strict";R();N();ie();G();$o();Pe=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},Lu=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],qt=(e,t,n,r,o,i,s=!1,a=!1)=>{let u=[],d=n[0].dims,c=d.length,l=v.normalizeAxes(o,c),p=!a&&l.length===0;d.forEach((y,w)=>{p||l.indexOf(w)>=0?s&&u.push(1):u.push(y)});let f=u.length,m=v.size(u);return{name:e,shaderCache:t,getShaderSource:y=>{let w=[],g=S("_A",n[0].dataType,c),b=C("output",i,f),$=r(g,b,l),_=$[2];for(let x=0,I=0;x<c;x++)p||l.indexOf(x)>=0?(s&&I++,_=`for(var j${x}: u32 = 0; j${x} < ${d[x]}; j${x}++) {
                  ${$[2].includes("last_index")?`let last_index = j${x};`:""}
                  ${g.indicesSet("input_indices",x,`j${x}`)}
                  ${_}
                }`):(w.push(`${g.indicesSet("input_indices",x,b.indicesGet("output_indices",I))};`),I++);return`

        ${y.registerUniform("output_size","u32").declareVariables(g,b)}

        ${y.mainStart()}
          ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${g.type.indices};
          let output_indices = ${b.offsetToIndices("global_idx")};

          ${w.join(`
`)}
          ${$[0]}       // init ops for reduce max/min
          ${$[1]}
          ${_}
          ${$[3]}
          ${$.length===4?b.setByOffset("global_idx","value"):$.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:u,dataType:i}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...E(d,u)]})}},Bn=(e,t)=>{let n=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(r=>n.push(Number(r))),M({axes:n,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},ze=(e,t,n,r)=>{let o=e.inputs,i=o.length===1?n:Bn(o,n);e.compute(qt(t,{hint:i.cacheKey,inputDependencies:["rank"]},[o[0]],i.noopWithEmptyAxes&&i.axes.length===0?Lu:r,i.axes,o[0].dataType,i.keepDims,i.noopWithEmptyAxes),{inputs:[0]})},Hu=(e,t)=>{Pe(e.inputs),ze(e,"ReduceLogSum",t,(r,o)=>[`var value = ${o.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,"value = log(value);"])},qu=(e,t)=>{Pe(e.inputs),ze(e,"ReduceL1",t,(r,o)=>[`var value = ${o.type.storage}(0);`,"",`value += abs(${r.getByIndices("input_indices")});`,""])},Fu=(e,t)=>{Pe(e.inputs),ze(e,"ReduceL2",t,(r,o)=>[`var t = ${o.type.value}(0); var value = ${o.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},Ku=(e,t)=>{Pe(e.inputs),ze(e,"ReduceLogSumExp",t,(r,o)=>[`var value = ${o.type.storage}(0);`,"",`value += exp(${r.getByIndices("input_indices")});`,"value = log(value);"])},ju=(e,t)=>{Pe(e.inputs),ze(e,"ReduceMax",t,(r,o,i)=>{let s=[];for(let a=0;a<r.rank;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(r.indicesSet("input_indices",a,0));return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = max(value, ${r.getByIndices("input_indices")});`,""]})},Zu=(e,t)=>{Pe(e.inputs),ze(e,"ReduceMean",t,(r,o,i)=>{let s=1;for(let a=0;a<r.rank;a++)(i.indexOf(a)>=0||i.length===0)&&(s*=e.inputs[0].dims[a]);return["var sum = f32(0);","",`sum += f32(${r.getByIndices("input_indices")});`,`let value = ${o.type.value}(sum / ${s});`]})},Xu=(e,t)=>{Pe(e.inputs),ze(e,"ReduceMin",t,(r,o,i)=>{let s=[];for(let a=0;a<r.rank;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(`input_indices[${a}] = 0;`);return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = min(value, ${r.getByIndices("input_indices")});`,""]})},Qu=(e,t)=>{Pe(e.inputs),ze(e,"ReduceProd",t,(r,o)=>[`var value = ${o.type.storage}(1);`,"",`value *= ${r.getByIndices("input_indices")};`,""])},Yu=(e,t)=>{Pe(e.inputs),ze(e,"ReduceSum",t,(r,o)=>[`var value = ${o.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,""])},Ju=(e,t)=>{Pe(e.inputs),ze(e,"ReduceSumSquare",t,(r,o)=>[`var t = ${o.type.value}(0); var value = ${o.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += t * t;`,""])},Oe=(e,t,n)=>{if(t.length===0)return n;let r=1,o=1;for(let i=0;i<t.length;i++)t.indexOf(i)===-1?r*=e[i]:o*=e[i];return o<32&&r>1024},_o=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Zu(e,t):lo(e,t)},vo=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?qu(e,t):co(e,t)},xo=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Fu(e,t):po(e,t)},So=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ku(e,t):mo(e,t)},Io=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?ju(e,t):fo(e,t)},Co=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Xu(e,t):ho(e,t)},To=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Qu(e,t):go(e,t)},Ao=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Yu(e,t):yo(e,t)},ko=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ju(e,t):bo(e,t)},Eo=(e,t)=>{Oe(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Hu(e,t):wo(e,t)}});var Po,zo,Oo,Dn,Bo=A(()=>{"use strict";R();ie();Ht();Po=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},zo=(e,t)=>{Po(e.inputs);let n=(r,o,i)=>{let s=[];for(let a=0;a<r.rank;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(`input_indices[${a}] = 0;`);return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${r.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${r.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",o.setByOffset("global_idx","best_index")]};e.compute(qt("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],n,[t.axis],7,t.keepDims),{inputs:[0]})},Oo=(e,t)=>{Po(e.inputs);let n=(r,o,i)=>{let s=[];for(let a=0;a<r.rank;a++)(i.indexOf(a)>=0||i.length===0)&&s.push(`input_indices[${a}] = 0;`);return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${r.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${r.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",o.setByOffset("global_idx","best_index")]};e.compute(qt("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],n,[t.axis],7,t.keepDims),{inputs:[0]})},Dn=e=>M(e)});var ed,td,nd,rd,Je,od,Do,Ft=A(()=>{"use strict";R();N();Vt();G();ed=(e,t)=>{let n=e[0],r=e[1],o=e[2],i=e[3],s=e[4],a=e[5];if(s&&a)throw new Error("Attention cannot have both past and attention_bias");if(n.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let u=n.dims[0],d=n.dims[1],c=n.dims[2];if(o.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(r.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(r.dims[0]!==c)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(o.dims[0]!==r.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let l=o.dims[0]/3,p=l,f=p;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let b of t.qkvHiddenSizes)if(b%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");l=t.qkvHiddenSizes[0],p=t.qkvHiddenSizes[1],f=t.qkvHiddenSizes[2]}let m=d;if(l!==p)throw new Error("qkv_hidden_sizes first element should be same as the second");if(o.dims[0]!==l+p+f)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let h=0;if(s){if(p!==f)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(s.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(s.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(s.dims[1]!==u)throw new Error('Input "past" second dimension must be batch_size');if(s.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(s.dims[4]!==p/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||(h=s.dims[3])}let y=m+h,w=-1,g=0;if(i)throw new Error("Mask not supported");if(s)throw new Error("past is not supported");if(a){if(a.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(a.dims[0]!==u||a.dims[1]!==t.numHeads||a.dims[2]!==d||a.dims[3]!==y)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:u,sequenceLength:d,pastSequenceLength:h,kvSequenceLength:m,totalSequenceLength:y,maxSequenceLength:w,inputHiddenSize:c,hiddenSize:l,vHiddenSize:f,headSize:Math.floor(l/t.numHeads),vHeadSize:Math.floor(f/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:g,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},td=(e,t,n)=>{let r=ee(n),o=64,i=n/r;i<o&&(o=32);let s=Math.ceil(n/r/o),a=[{type:1,data:1/n},{type:12,data:i},{type:12,data:s}],u=Q(e.dataType,r),d=de(1,r),c=["type"],l=p=>{let f=C("x",e.dataType,e.dims,r),m=de(e.dataType),h=[{name:"d_inv",type:"f32"},{name:"d_comp",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${o}>;
  var<workgroup> thread_sum: array<f32, ${o}>;
  ${p.registerUniforms(h).declareVariables(f)}
  ${p.mainStart([o,1,1])}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${o}) * uniforms.d_comp + local_offset;

    var thread_max_vector = ${d}(-3.402823e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < uniforms.d_comp; i++) {
      thread_max_vector = max(${d}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(r){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${r}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.402823e+38f);
    for (var i = 0u; i < ${o}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${d}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < uniforms.d_comp; i++) {
      sum_vector += exp(${d}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(r){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${r}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${o}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < uniforms.d_comp; i++) {
        x[offset + i] = ${f.type.value}(${m}(uniforms.d_inv));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < uniforms.d_comp; i++) {
        var f32input = ${d}(x[offset + i]);
        x[offset + i] = ${f.type.value}(exp(f32input - max_value) / sum);
      }
    }
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${o};${u};${r}`,inputDependencies:c},getShaderSource:l,getRunData:()=>({outputs:[],dispatchGroup:{x:t},programUniforms:a})}},nd=(e,t,n,r,o,i,s,a)=>{let u=a+i.kvSequenceLength,d=[i.batchSize,i.numHeads,i.sequenceLength,u],c=i.kvNumHeads===void 0&&e>1&&r,l=c?[i.batchSize,i.numHeads,u,i.headSize]:void 0,p=s.scale===0?1/Math.sqrt(i.headSize):s.scale,f=ee(i.headSize),m=i.headSize/f,h=12,y={x:Math.ceil(u/h),y:Math.ceil(i.sequenceLength/h),z:i.batchSize*i.numHeads},w=[{type:12,data:i.sequenceLength},{type:12,data:m},{type:12,data:u},{type:12,data:i.numHeads},{type:1,data:p},{type:12,data:a},{type:12,data:i.kvSequenceLength}],g=c&&r&&v.size(r.dims)>0,b=["type","type"];g&&b.push("type"),o&&b.push("type");let $=[{dims:d,dataType:t.dataType,gpuDataType:0}];c&&$.push({dims:l,dataType:t.dataType,gpuDataType:0});let _=x=>{let I=S("q",t.dataType,t.dims,f),T=S("key",n.dataType,n.dims,f),P=[I,T];if(g){let q=S("past_key",r.dataType,r.dims,f);P.push(q)}o&&P.push(S("attention_bias",o.dataType,o.dims));let z=C("output",t.dataType,d),D=[z];c&&D.push(C("present_key",t.dataType,l,f));let j=de(1,f),L=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"}];return`
  const TILE_SIZE = ${h}u;

  var<workgroup> tileQ: array<${I.type.storage}, ${h*h}>;
  var<workgroup> tileK: array<${I.type.storage}, ${h*h}>;
  ${x.registerUniforms(L).declareVariables(...P,...D)}
  ${x.mainStart([h,h,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let qOffset = uniforms.M * uniforms.K * headIdx + m * uniforms.K;
    ${(()=>g&&c?`
    let kOffset = uniforms.kv_sequence_length * uniforms.K * headIdx;
    let pastKeyOffset = uniforms.past_sequence_length * uniforms.K * headIdx;`:`
    let kOffset = uniforms.N * uniforms.K * headIdx + n * uniforms.K;`)()}
    ${c?"let presentKeyOffset = headIdx * uniforms.N * uniforms.K;":""}
    var value = ${j}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${(()=>g&&c?`
              if (n + local_id.y < uniforms.past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else {
                tileK[idx] =
                         key[kOffset + (n + local_id.y - uniforms.past_sequence_length) * uniforms.K + w + local_id.x];
              }`:"tileK[idx] = key[kOffset + local_id.y * uniforms.K + w + local_id.x];")()}
      ${c?"present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];":""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
        value += ${j}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    let headOffset = headIdx * uniforms.M * uniforms.N;
    if (global_id.y < uniforms.M && global_id.x < uniforms.N) {
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(f){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${f}`)}})()};
        output[outputIdx] = ${z.type.value} (sum * uniforms.alpha) + ${o?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${f};${o!==void 0};${r!==void 0};${e}`,inputDependencies:b},getRunData:()=>({outputs:$,dispatchGroup:y,programUniforms:w}),getShaderSource:_}},rd=(e,t,n,r,o,i)=>{let s=i+o.kvSequenceLength,a=o.nReps?o.nReps:1,u=o.vHiddenSize*a,d=o.kvNumHeads==null&&e>1&&r,c=d?[o.batchSize,o.numHeads,s,o.headSize]:void 0,l=[o.batchSize,o.sequenceLength,u],p=12,f={x:Math.ceil(o.vHeadSize/p),y:Math.ceil(o.sequenceLength/p),z:o.batchSize*o.numHeads},m=[{type:12,data:o.sequenceLength},{type:12,data:s},{type:12,data:o.vHeadSize},{type:12,data:o.numHeads},{type:12,data:u},{type:12,data:i},{type:12,data:o.kvSequenceLength}],h=d&&r&&v.size(r.dims)>0,y=["type","type"];h&&y.push("type");let w=[{dims:l,dataType:t.dataType,gpuDataType:0}];d&&w.push({dims:c,dataType:t.dataType,gpuDataType:0});let g=b=>{let $=S("probs",t.dataType,t.dims),_=S("v",n.dataType,n.dims),x=[$,_];h&&x.push(S("past_value",r.dataType,r.dims));let T=[C("output",t.dataType,l)];d&&T.push(C("present_value",t.dataType,c));let P=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"}];return`
  const TILE_SIZE = ${p}u;
  var<workgroup> tileQ: array<${$.type.value}, ${p*p}>;
  var<workgroup> tileK: array<${$.type.value}, ${p*p}>;
  ${b.registerUniforms(P).declareVariables(...x,...T)}
  ${b.mainStart([p,p,1])}
   let headIdx = workgroup_id.z;
   let m = global_id.y;
   let n = global_id.x;

   let offsetA = headIdx * (uniforms.M * uniforms.K) + m * uniforms.K;
   ${(()=>h&&d?`
    let pastValueOffset = headIdx * uniforms.N * uniforms.past_sequence_length + n;
    let vOffset = headIdx * uniforms.N * uniforms.kv_sequence_length + n;
      `:`
   let offsetB = headIdx * uniforms.N * uniforms.K + n;
            `)()}
    ${d?"let presentValueOffset = headIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${$.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${(()=>h&&d?`
        if (w + local_id.y < uniforms.past_sequence_length) {
          tileK[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else {
          tileK[idx] = v[vOffset + (w + local_id.y - uniforms.past_sequence_length) * uniforms.N];
        }
      `:`
        tileK[idx] = v[offsetB + (w + local_id.y) * uniforms.N];
      `)()}
        ${d?"present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileK[idx];":""}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let currentBatchHeadNumber = workgroup_id.z % uniforms.num_heads;
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + currentBatchHeadNumber * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`};return{name:"AttentionScore",shaderCache:{hint:`${r!==void 0};${e}`,inputDependencies:y},getRunData:()=>({outputs:w,dispatchGroup:f,programUniforms:m}),getShaderSource:g}},Je=(e,t,n,r,o,i,s,a,u,d,c)=>{let l=Math.min(e.outputCount,1+(s?1:0)+(a?1:0)),p=d.kvNumHeads!==void 0||l>1?d.pastSequenceLength:0,f=p+d.kvSequenceLength,m=u&&v.size(u.dims)>0?u:void 0,h=[t,n];d.kvNumHeads===void 0&&l>1&&s&&v.size(s.dims)>0&&h.push(s),m&&h.push(m);let y=e.compute(nd(l,t,n,s,m,d,c,p),{inputs:h,outputs:d.kvNumHeads===void 0&&l>1?[-1,1]:[-1]})[0];e.compute(td(y,d.batchSize*d.numHeads*d.sequenceLength,f),{inputs:[y],outputs:[]});let w=[y,r];d.kvNumHeads===void 0&&l>1&&a&&v.size(a.dims)>0&&w.push(a),e.compute(rd(l,y,r,a,d,p),{inputs:w,outputs:d.kvNumHeads===void 0&&l>1?[0,2]:[0]})},od=(e,t)=>{let n=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],r=t.sequenceLength,o=t.inputHiddenSize,i=t.headSize,s=12,a={x:Math.ceil(t.headSize/s),y:Math.ceil(t.sequenceLength/s),z:t.batchSize*t.numHeads},u=[e.inputs[0],e.inputs[1],e.inputs[2]],d=[{type:12,data:r},{type:12,data:o},{type:12,data:i},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],c=l=>{let p=C("output_q",u[0].dataType,n),f=C("output_k",u[0].dataType,n),m=C("output_v",u[0].dataType,n),h=S("input",u[0].dataType,u[0].dims),y=S("weight",u[1].dataType,u[1].dims),w=S("bias",u[2].dataType,u[2].dims),g=h.type.storage,b=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${s}u;
  var<workgroup> tileInput: array<${g}, ${s*s}>;
  var<workgroup> tileWeightQ: array<${g}, ${s*s}>;
  var<workgroup> tileWeightK: array<${g}, ${s*s}>;
  var<workgroup> tileWeightV: array<${g}, ${s*s}>;
  ${l.registerUniforms(b).declareVariables(h,y,w,p,f,m)}
  ${l.mainStart([s,s,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${g}(0);
    var valueK = ${g}(0);
    var valueV = ${g}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:a,programUniforms:d}),getShaderSource:c},{inputs:u,outputs:[-1,-1,-1]})},Do=(e,t)=>{let n=ed(e.inputs,t),[r,o,i]=od(e,n);return Je(e,r,o,i,e.inputs[4],void 0,void 0,void 0,e.inputs[5],n,t)}});var id,sd,ad,Ro,Uo=A(()=>{"use strict";Se();R();N();ie();G();id=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let n=(r,o,i)=>{let s=o.length;if(s!==r.length)throw new Error(`${i}: num dimensions != ${s}`);o.forEach((a,u)=>{if(a!==r[u])throw new Error(`${i}: dim[${u}] do not match`)})};if(e[0].dims.length>1){let r=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);n(e[1].dims,r,"Invalid input scale"),n(e[2].dims,r,"Invalid input B"),n(e[3].dims,r,"Invalid input mean"),n(e[4].dims,r,"Invalid input var")}else n(e[1].dims,[1],"Invalid input scale"),n(e[2].dims,[1],"Invalid input B"),n(e[3].dims,[1],"Invalid input mean"),n(e[4].dims,[1],"Invalid input var")},sd=(e,t)=>{let{epsilon:n,spatial:r,format:o}=t,i=e[0].dims,s=r?ee(i[i.length-1]):1,a=o==="NHWC"&&i.length>1?s:1,u=v.size(i)/s,d=r,c=d?i.length:i,l=S("x",e[0].dataType,e[0].dims,s),p=S("scale",e[1].dataType,e[1].dims,a),f=S("bias",e[2].dataType,e[2].dims,a),m=S("inputMean",e[3].dataType,e[3].dims,a),h=S("inputVar",e[4].dataType,e[4].dims,a),y=C("y",e[0].dataType,c,s),w=()=>{let b="";if(r)b=`let cOffset = ${i.length===1?"0u":o==="NHWC"?`outputIndices[${i.length-1}] / ${s}`:"outputIndices[1]"};`;else if(o==="NCHW")b=`
            ${y.indicesSet("outputIndices","0","0")}
            let cOffset = ${y.indicesToOffset("outputIndices")};`;else{b=`var cIndices = ${p.type.indices}(0);
                       cIndices[0] = outputIndices[${i.length-1}];`;for(let $=1;$<p.rank;$++)b+=`cIndices[${$}] = outputIndices[${$}];`;b+=`let cOffset = ${p.indicesToOffset("cIndices")};`}return b},g=b=>`
  const epsilon = ${n};
  ${b.registerUniform("outputSize","u32").declareVariables(l,p,f,m,h,y)}
  ${b.mainStart()}
  ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${y.offsetToIndices(`global_idx * ${s}`)};
    ${w()}
    let scale = ${p.getByOffset("cOffset")};
    let bias = ${f.getByOffset("cOffset")};
    let inputMean = ${m.getByOffset("cOffset")};
    let inputVar = ${h.getByOffset("cOffset")};
    let x = ${l.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${y.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${r}_${s}`,inputDependencies:d?["rank","type","type","type","type"]:void 0},getShaderSource:g,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d?[{type:12,data:u},...E(i)]:[{type:12,data:u}]})}},ad=e=>M(e),Ro=(e,t)=>{let{inputs:n,outputCount:r}=e,o=ad({...t,outputCount:r});if(X.webgpu.validateInputContent&&id(n,o),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(sd(n,o))}});var ud,dd,Mo,Vo=A(()=>{"use strict";N();G();ud=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},dd=e=>{let t=e[0].dims,n=e[0].dims[2],r=v.size(t)/4,o=e[0].dataType,i=S("input",o,t,4),s=S("bias",o,[n],4),a=S("residual",o,t,4),u=C("output",o,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(r/64)}}),getShaderSource:c=>`
  const channels = ${n}u / 4;
  ${c.declareVariables(i,s,a,u)}

  ${c.mainStart()}
    ${c.guardAgainstOutOfBoundsWorkgroupSizes(r)}
    let value = ${i.getByOffset("global_idx")}
      + ${s.getByOffset("global_idx % channels")} + ${a.getByOffset("global_idx")};
    ${u.setByOffset("global_idx","value")}
  }`}},Mo=e=>{ud(e.inputs),e.compute(dd(e.inputs))}});var ld,Z,No,Wo,Go,Lo,Ho,qo,Fo,Ko,jo,cd,Zo,Xo,Qo,Yo,dt,Jo,Kt,ei,ti,ni,ri,oi,ii,si,ai,ui,di,li,ci,pi,mi,fi,hi,gi,yi,Rn,Un,bi,wi,$i,pd,md,_i,jt=A(()=>{"use strict";R();N();ie();G();ld=(e,t,n,r,o,i)=>{let s=Math.ceil(t/4),a="";typeof o=="string"?a=`${o}(a)`:a=o("a");let u=S("inputData",n,[s],4),d=C("outputData",r,[s],4);return`
      ${e.registerUniform("vec_size","u32").declareVariables(u,d)}

  ${i??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${u.getByOffset("global_idx")};
    ${d.setByOffset("global_idx",a)}
  }`},Z=(e,t,n,r,o,i=e.dataType)=>({name:t,shaderCache:{hint:o,inputDependencies:["type"]},getShaderSource:s=>ld(s,v.size(e.dims),e.dataType,i,n,r),getRunData:s=>({outputs:[{dims:e.dims,dataType:i}],dispatchGroup:{x:Math.ceil(v.size(s[0].dims)/64/4)},programUniforms:[{type:12,data:Math.ceil(v.size(e.dims)/4)}]})}),No=e=>{e.compute(Z(e.inputs[0],"Abs","abs"))},Wo=e=>{e.compute(Z(e.inputs[0],"Acos","acos"))},Go=e=>{e.compute(Z(e.inputs[0],"Acosh","acosh"))},Lo=e=>{e.compute(Z(e.inputs[0],"Asin","asin"))},Ho=e=>{e.compute(Z(e.inputs[0],"Asinh","asinh"))},qo=e=>{e.compute(Z(e.inputs[0],"Atan","atan"))},Fo=e=>{e.compute(Z(e.inputs[0],"Atanh","atanh"))},Ko=e=>M(e),jo=(e,t)=>{let n;switch(t.to){case 10:n="vec4<f16>";break;case 1:n="vec4<f32>";break;case 12:n="vec4<u32>";break;case 6:n="vec4<i32>";break;case 9:n="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(Z(e.inputs[0],"Cast",n,void 0,t.cacheKey,t.to))},cd=e=>{let t=e.length>=2&&e[1].data!==0?e[1].getFloat32Array()[0]:Wt,n=e.length>=3&&e[2].data!==0?e[2].getFloat32Array()[0]:Gt;return M({min:t,max:n})},Zo=(e,t)=>{let n=e.inputs.length===1?t:cd(e.inputs),r=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"Clip",o=>`clamp(${o}, clip_min_, clip_max_)`,`
    const clip_min_: vec4<${r}> = vec4(${r}(${n.min}));
    const clip_max_: vec4<${r}> = vec4(${r}(${n.max}));
`,n.cacheKey),{inputs:[0]})},Xo=e=>{e.compute(Z(e.inputs[0],"Ceil","ceil"))},Qo=e=>{e.compute(Z(e.inputs[0],"Cos","cos"))},Yo=e=>{e.compute(Z(e.inputs[0],"Cosh","cosh"))},dt=e=>M(e),Jo=(e,t)=>{let n=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"Elu",r=>`elu_vf32(${r})`,`
  const elu_alpha_ = ${n}(${t.alpha});

  fn elu_f32(a: ${n}) -> ${n} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${n}>) -> vec4<${n}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},Kt=(e="f32")=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,ei=e=>{let t=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"Erf",n=>`erf_vf32(${n})`,Kt(t)))},ti=e=>{e.compute(Z(e.inputs[0],"Exp","exp"))},ni=e=>{e.compute(Z(e.inputs[0],"Floor","floor"))},ri=e=>{let t=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"Gelu",n=>`0.5 * ${n} * (1.0 + erf_vf32(${n} * 0.7071067811865475))`,Kt(t)))},oi=(e,t)=>{let n=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"LeakyRelu",r=>`select(leaky_relu_alpha_ * ${r}, ${r}, ${r} >= vec4<${n}>(0.0))`,`const leaky_relu_alpha_ = ${n}(${t.alpha});`,t.cacheKey))},ii=e=>{e.compute(Z(e.inputs[0],"Not",t=>`!${t}`))},si=e=>{e.compute(Z(e.inputs[0],"Neg",t=>`-${t}`))},ai=e=>{e.compute(Z(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},ui=e=>{let t=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"Relu",n=>`select(vec4<${t}>(0.0), ${n}, ${n} > vec4<${t}>(0.0))`))},di=e=>{e.compute(Z(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},li=e=>M(e),ci=(e,t)=>{let n=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"HardSigmoid",r=>`max(vec4<${n}>(0.0), min(vec4<${n}>(1.0), ${t.alpha} * ${r} + vec4<${n}>(${t.beta})))`,void 0,t.cacheKey))},pi=e=>{e.compute(Z(e.inputs[0],"Sin","sin"))},mi=e=>{e.compute(Z(e.inputs[0],"Sinh","sinh"))},fi=e=>{e.compute(Z(e.inputs[0],"Sqrt","sqrt"))},hi=e=>{e.compute(Z(e.inputs[0],"Tan","tan"))},gi=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,yi=e=>{e.compute(Z(e.inputs[0],"Tanh",gi))},Rn=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${gi("v")};
}
`,Un=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,bi=e=>{let t=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"FastGelu",Un,Rn(t),void 0,e.inputs[0].dataType))},wi=(e,t)=>{let n=de(e.inputs[0].dataType);return e.compute(Z(e.inputs[0],"ThresholdedRelu",r=>`select(vec4<${n}>(0.0), ${r}, ${r} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${n}>(${t.alpha});`,t.cacheKey)),0},$i=e=>{e.compute(Z(e.inputs[0],"Log","log"))},pd=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,md=e=>`quick_gelu_impl(${e})`,_i=(e,t)=>{let n=de(e.inputs[0].dataType);e.compute(Z(e.inputs[0],"QuickGelu",md,pd(n,t.alpha),t.cacheKey,e.inputs[0].dataType))}});var fd,hd,xi,Si=A(()=>{"use strict";N();G();jt();fd=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},hd=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let n=S("input",e[0].dataType,e[0].dims,4),r=S("bias",e[0].dataType,[e[0].dims[2]],4),o=C("output",e[0].dataType,t,4),i=v.size(t)/4,s=Q(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:u=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${u.declareVariables(n,r,o)}

  ${Kt(s)}

  ${u.mainStart()}
    ${u.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${o.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},xi=e=>{fd(e.inputs),e.compute(hd(e.inputs))}});var gd,yd,Be,Ii,Ci,Ti,Ai,ki,Ei,Pi,zi,Oi,Bi,Di=A(()=>{"use strict";R();N();G();gd=(e,t,n,r,o,i,s,a,u,d,c,l)=>{let p,f;typeof a=="string"?p=f=(g,b)=>`${a}((${g}),(${b}))`:typeof a=="function"?p=f=a:(p=a.scalar,f=a.vector);let m=C("outputData",c,r.length,4),h=S("aData",u,t.length,4),y=S("bData",d,n.length,4),w;if(o)if(i){let g=v.size(t)===1,b=v.size(n)===1,$=t.length>0&&t[t.length-1]%4===0,_=n.length>0&&n[n.length-1]%4===0;g||b?w=m.setByOffset("global_idx",f(g?`${h.type.value}(${h.getByOffset("0")}.x)`:h.getByOffset("global_idx"),b?`${y.type.value}(${y.getByOffset("0")}.x)`:y.getByOffset("global_idx"))):w=`
            let outputIndices = ${m.offsetToIndices("global_idx * 4u")};
            let offsetA = ${h.broadcastedIndicesToOffset("outputIndices",m)};
            let offsetB = ${y.broadcastedIndicesToOffset("outputIndices",m)};
            ${m.setByOffset("global_idx",f(s||$?h.getByOffset("offsetA / 4u"):`${h.type.value}(${h.getByOffset("offsetA / 4u")}[offsetA % 4u])`,s||_?y.getByOffset("offsetB / 4u"):`${y.type.value}(${y.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else w=m.setByOffset("global_idx",f(h.getByOffset("global_idx"),y.getByOffset("global_idx")));else{if(!i)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let g=(b,$,_="")=>{let x=`aData[indexA${$}][componentA${$}]`,I=`bData[indexB${$}][componentB${$}]`;return`
            let outputIndices${$} = ${m.offsetToIndices(`global_idx * 4u + ${$}u`)};
            let offsetA${$} = ${h.broadcastedIndicesToOffset(`outputIndices${$}`,m)};
            let offsetB${$} = ${y.broadcastedIndicesToOffset(`outputIndices${$}`,m)};
            let indexA${$} = offsetA${$} / 4u;
            let indexB${$} = offsetB${$} / 4u;
            let componentA${$} = offsetA${$} % 4u;
            let componentB${$} = offsetB${$} % 4u;
            ${b}[${$}] = ${_}(${p(x,I)});
          `};c===9?w=`
            var data = vec4<u32>(0);
            ${g("data",0,"u32")}
            ${g("data",1,"u32")}
            ${g("data",2,"u32")}
            ${g("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:w=`
            ${g("outputData[global_idx]",0)}
            ${g("outputData[global_idx]",1)}
            ${g("outputData[global_idx]",2)}
            ${g("outputData[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(h,y,m)}

        ${l??""}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${w}
      }`},yd=(e,t,n,r,o,i,s=n.dataType)=>{let a=!v.areEqual(n.dims,r.dims),u=n.dims,d=v.size(n.dims),c=!1,l=!1,p=[a];if(a){let f=ke.calcShape(n.dims,r.dims,!1);if(!f)throw new Error("Can't perform binary op on the given tensors");u=f,d=v.size(u);let m=v.size(n.dims)===1,h=v.size(r.dims)===1,y=n.dims.length>0&&n.dims[n.dims.length-1]%4===0,w=r.dims.length>0&&r.dims[r.dims.length-1]%4===0;p.push(m),p.push(h),p.push(y),p.push(w);let g=1;for(let b=1;b<u.length;b++){let $=n.dims[n.dims.length-b]??1,_=r.dims[r.dims.length-b]??1;if($===_)g*=$;else break}g%4===0?(l=!0,c=!0):(m||h||y||w)&&(c=!0)}else c=!0;return p.push(c),{name:e,shaderCache:{hint:t+p.map(f=>f.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:f=>gd(f,n.dims,r.dims,u,c,a,l,o,n.dataType,r.dataType,s,i),getRunData:()=>({outputs:[{dims:u,dataType:s}],dispatchGroup:{x:Math.ceil(d/64/4)},programUniforms:[{type:12,data:Math.ceil(v.size(u)/4)},...E(n.dims,r.dims,u)]})}},Be=(e,t,n,r,o,i)=>{e.compute(yd(t,o??"",e.inputs[0],e.inputs[1],n,r,i))},Ii=e=>{Be(e,"Add",(t,n)=>`${t}+${n}`)},Ci=e=>{Be(e,"Div",(t,n)=>`${t}/${n}`)},Ti=e=>{Be(e,"Equal",{scalar:(t,n)=>`u32(${t}==${n})`,vector:(t,n)=>`vec4<u32>(${t}==${n})`},void 0,void 0,9)},Ai=e=>{Be(e,"Mul",(t,n)=>`${t}*${n}`)},ki=e=>{let t=S("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Be(e,"Pow",{scalar:(r,o)=>`pow_custom(${r},${o})`,vector:(r,o)=>`pow_vector_custom(${r},${o})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t==="i32"?"round":""}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},Ei=e=>{Be(e,"Sub",(t,n)=>`${t}-${n}`)},Pi=e=>{Be(e,"Greater",{scalar:(t,n)=>`u32(${t}>${n})`,vector:(t,n)=>`vec4<u32>(${t}>${n})`},void 0,void 0,9)},zi=e=>{Be(e,"Less",{scalar:(t,n)=>`u32(${t}<${n})`,vector:(t,n)=>`vec4<u32>(${t}<${n})`},void 0,void 0,9)},Oi=e=>{Be(e,"GreaterOrEqual",{scalar:(t,n)=>`u32(${t}>=${n})`,vector:(t,n)=>`vec4<u32>(${t}>=${n})`},void 0,void 0,9)},Bi=e=>{Be(e,"LessOrEqual",{scalar:(t,n)=>`u32(${t}<=${n})`,vector:(t,n)=>`vec4<u32>(${t}<=${n})`},void 0,void 0,9)}});var wd,$d,_d,vd,Ri,Ui,Mi=A(()=>{"use strict";R();N();ie();G();wd=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let n=0,r=e[n],o=r.dataType,i=r.dims.length;e.forEach((s,a)=>{if(a!==n){if(s.dataType!==o)throw new Error("input tensors should be one type");if(s.dims.length!==i)throw new Error("input tensors should have the same shape");s.dims.forEach((u,d)=>{if(d!==t&&u!==r.dims[d])throw new Error("non concat dimensions must match")})}})},$d=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,_d=(e,t)=>{let n=e.length,r=[];for(let o=0;o<n;++o){let i=t.setByOffset("global_idx",e[o].getByIndices("indices"));n===1?r.push(i):o===0?r.push(`if (inputIndex == ${o}u) { ${i} }`):o===n-1?r.push(`else { ${i} }`):r.push(`else if (inputIndex == ${o}) { ${i} }`)}return r.join(`
`)},vd=(e,t,n,r)=>{let o=v.size(n),i=new Array(e.length),s=new Array(e.length),a=0,u=[],d=[],c=[{type:12,data:o}];for(let h=0;h<e.length;++h)a+=e[h].dims[t],i[h]=a,d.push(e[h].dims.length),s[h]=S(`input${h}`,r,d[h]),u.push("rank"),c.push({type:12,data:i[h]});for(let h=0;h<e.length;++h)c.push(...E(e[h].dims));c.push(...E(n));let l=C("output",r,n.length),p=l.indicesGet("indices",t),f=Array.from(Array(i.length).keys()).map(h=>`uniforms.sizeInConcatAxis${h}`).join(","),m=h=>`

  ${(()=>{h.registerUniform("outputSize","u32");for(let y=0;y<e.length;y++)h.registerUniform(`sizeInConcatAxis${y}`,"u32");return h.declareVariables(...s,l)})()}

  ${$d(i.length,f)}

  ${h.mainStart()}
    ${h.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${l.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${p});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${i.length}u>(${f});
      ${p} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${_d(s,l)}
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:n,dataType:r}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:c}),getShaderSource:m}},Ri=(e,t)=>{let n=e.inputs,r=n[0].dims,o=v.normalizeAxis(t.axis,r.length);wd(n,o);let i=r.slice();i[o]=n.reduce((a,u)=>a+(u.dims.length>o?u.dims[o]:0),0);let s=n.filter(a=>v.size(a.dims)>0);e.compute(vd(s,o,i,n[0].dataType),{inputs:s})},Ui=e=>M({axis:e.axis})});var _e,ve,xe,Zt,Re=A(()=>{"use strict";R();N();_e=(e,t,n="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${n}(uniforms.clip_min)), ${t}(${n}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${n}(uniforms.alpha) * value + ${n}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${n}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},ve=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},xe=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},Zt=e=>{let t=e?.activation||"";if(t==="HardSigmoid"){let[n,r]=e?.activation_params||[.2,.5];return{activation:t,alpha:n,beta:r}}else if(t==="Clip"){let[n,r]=e?.activation_params||[Wt,Gt];return{activation:t,clipMax:r,clipMin:n}}else if(t==="LeakyRelu"){let[n]=e?.activation_params||[.01];return{activation:t,alpha:n}}return{activation:t}}});var le,Xt,lt=A(()=>{"use strict";le=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},Xt=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `});var Qt,Mn=A(()=>{"use strict";Qt=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`});var xd,Sd,ct,Vi,Id,pt,Cd,Yt,mt=A(()=>{"use strict";R();N();G();Re();lt();xd=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?", batchIndices":""});
        `,Sd=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?"":"let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];"}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached3[i] + acc[i];"}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached.w + acc[i];"}
        }`,ct=(e,t,n="f32",r,o=!1,i=32,s=!1,a=32)=>{let u=t[1]*e[1],d=t[0]*e[0],c=o?u:i,l=o?i:u,p=c/t[0],f=i/t[1];if(!((o&&p===4&&e[1]===4||!o&&(p===3||p===4))&&c%t[0]===0&&i%t[1]===0&&e[0]===4))throw new Error(`If transposeA ${o} is true, innerElementSize ${p} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${p} must be 3 or 4.
  tileAWidth ${c} must be divisible by workgroupSize[0]${t[0]}. tileInner ${i} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${p}<${n}>, ${c/p}>, ${l}>;
var<workgroup> mm_Bsub: array<array<vec4<${n}>, ${d/e[0]}>, ${i}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${p};
const tileInner = ${i};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${s?"0":"i32(globalId.z)"};
  ${r?`let batchIndices = ${r.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${u};

  let num_tiles = ${s?`${Math.ceil(a/i)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${s?`i32(globalId.z) * ${a}`:"0"};

  var acc: array<vec4<${n}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${f};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${xd(o,r)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${f}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${r?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${p===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${Sd(o,p)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},Vi=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?", batchIndices":""});
            `,Id=e=>e?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",pt=(e,t,n="f32",r,o=!1,i=32,s=!1,a=32,u=!1)=>{let d=e[1]*t[1],c=e[0]*t[0],l=o?d:i,p=o?i:d;if(!(p%t[1]===0&&l%t[0]===0&&i%t[1]===0))throw new Error(`tileAHight ${p} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${l} must be divisible by workgroupSize[0]${t[0]}, tileInner ${i} must be divisible by workgroupSize[1]${t[1]}`);let f=p/t[1],m=l/t[0],h=i/t[1],y=u?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${d};
    let globalColStart = i32(workgroupId.x) * ${c};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${p}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${l}; inputCol = inputCol + ${t[0]}) {
          ${Vi(o,r)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${i}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${c}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${r?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${n}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${o?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${d};

let tileRowA = i32(localId.y) * ${f};
let tileColA = i32(localId.x) * ${m};
let tileRowB = i32(localId.y) * ${h};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${f}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${m}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${Vi(o,r)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${h}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${r?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${n}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${Id(o)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${n}, ${l}>, ${p}>;
  var<workgroup> mm_Bsub : array<array<${n}, ${c}>, ${i}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${i};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${s?"0":"i32(globalId.z)"};
    ${r?`let batchIndices = ${r.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${s?`${Math.ceil(a/i)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${s?`i32(globalId.z) * ${a}`:"0"};

    var acc : array<array<${n}, colPerThread>, rowPerThread>;
    ${y}
  }
`},Cd=(e,t,n,r,o,i=!1)=>{let[s,a,u]=o,[d,c,l,p]=r,f=Ye(s,u),m=Ye(a,u),h=Q(r[0].type.tensor),y=()=>{let b=c.rank,$=d.rank,_=`var aIndices: ${c.type.indices};`;for(let x=b-2-1,I=$-1;x>=0;x--,I--)_+=`
aIndices[${x}] = ${$>1?`batchIndices[${I}]`:"batchIndices"};`;return f.forEach(x=>{_+=`
aIndices[${x}] = 0;`}),_+=`
aIndices[${b-2}] = u32(row);
                   aIndices[${b-1}] = u32(colIn);`,_},w=()=>{let b=l.rank,$=d.rank,_=`var bIndices: ${l.type.indices};`;for(let x=b-2-1,I=$-1;x>=0;x--,I--)_+=`
bIndices[${x}] = ${$>1?`batchIndices[${I}]`:"batchIndices"};`;return m.forEach(x=>{_+=`
bIndices[${x}] = 0;`}),_+=`
bIndices[${b-2}] = u32(row);
                   bIndices[${b-1}] = u32(colIn);`,_};return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${d.type.indices}) -> ${le(e,h)} {
      var value = ${le(e,h)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        ${y()}
        value = ${c.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${d.type.indices}) -> ${le(e,h)} {
      var value = ${le(e,h)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        ${w()}
        value = ${l.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${le(e,h)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${i?"bias[colIn]":`${le(e,h)}(bias[row])`};`:""}
        ${n}
        ${p.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},Yt=(e,t,n,r,o=!1,i)=>{let s=e[0].dims,a=e[1].dims,u=s.slice(0,-2),d=a.slice(0,-2),c=r?r.slice(0,-2):n.slice(0,-2),l=v.size(c),p=s[s.length-2],f=s[s.length-1],m=a[a.length-1],h=f%4===0&&m%4===0,y=p<=8?[4,1,1]:[4,4,1],w=[8,8,1],g=[Math.ceil(m/w[0]/y[0]),Math.ceil(p/w[1]/y[1]),Math.ceil(l/w[2]/y[2])],b=h?4:1,$=[...u,p,f/b],_=$.length,x=[...d,f,m/b],I=x.length,T=[l,p,m/b],P=[{type:6,data:p},{type:6,data:m},{type:6,data:f}];ve(t,P),P.push(...E(c,$,x));let z=["rank","rank"],D=e.length>2;D&&(P.push(...E(e[2].dims)),z.push("rank")),P.push(...E(T));let j=L=>{let q=c.length,ae=Lt("batchDims",e[0].dataType,q,1),U=Q(e[0].dataType),te=S("a",e[0].dataType,_,b),re=S("b",e[1].dataType,I,b),V=C("result",e[0].dataType,T.length,b),ne=[te,re];if(D){let B=o?b:1;ne.push(S("bias",e[2].dataType,e[2].dims.length,B))}let F=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];xe(t,F);let H=Q(V.type.tensor),K=_e(t,V.type.value,H),k=Cd(b,D,K,[ae,te,re,V],[u,d,c],o);return`
  ${L.registerUniforms(F).registerInternalVariables(ae).declareVariables(...ne,V)}
  ${k}
  ${h?ct(y,w,U,ae):pt(y,w,U,ae)}
                   `};return{name:"MatMul",shaderCache:{hint:`${y};${t.activation};${h};${o}`,inputDependencies:z},getRunData:()=>({outputs:[{dims:i?i(n):n,dataType:e[0].dataType}],dispatchGroup:{x:g[0],y:g[1],z:g[2]},programUniforms:P}),getShaderSource:j}}});var Td,Ni,Wi=A(()=>{"use strict";R();De();G();Re();lt();Mn();mt();Td=(e,t,n,r,o=!1,i,s=4,a=4,u=4,d="f32")=>{let c=z=>{switch(z){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${d}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${z} is not supported.`)}},l=z=>{switch(z){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${z} is not supported.`)}},p=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,f=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,m=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",h=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",y=e?"row":"col",w=e?"col":"row",g=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${y} / outWidth;
    let outCol = ${y} % outWidth;

    let WRow = ${w} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${w} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${w} % inChannels;
    var resData = ${le(s,d)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${m} && xCol >= 0 && xCol < ${h}) {
      ${p}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${c(s)}
    }
    return resData;`,b=e?t&&r?`
    let col = colIn * ${s};
    ${g}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${g}
    }
    return ${le(s,d)}(0.0);`:r&&n?`
    let col = colIn * ${s};
    ${g}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${g}
    }
    return ${le(s,d)}(0.0);`,$=`${l(a)}`,_=le(u,d),x=e?le(s,d):le(a,d),I=e?le(a,d):le(s,d),T=_e(i,_,d);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${x} {
      ${e?b:$}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${I} {
      ${e?$:b}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${_}) {
      let col = colIn * ${u};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${f}
      ${Xt(o)}
      ${T}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},Ni=(e,t,n,r,o,i,s,a,u)=>{let d=t.format==="NHWC",c=d?e[0].dims[3]:e[0].dims[1],l=n[0],p=d?n[2]:n[3],f=d?n[1]:n[2],m=d?n[3]:n[1],h=d&&(c%4===0||c%3===0)&&m%4===0,y=d?m:p*f,w=d?p*f:m,g=[8,8,1],b=r<=8?[4,1,1]:[4,4,1],$=[Math.ceil(y/g[0]/b[0]),Math.ceil(w/g[1]/b[1]),Math.ceil(l/g[2]/b[2])];J("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${$}`);let _=h?d&&c%4!==0?3:4:1,x=g[1]*b[1],I=g[0]*b[0],T=Math.max(g[0]*_,g[1]),P=r%x===0,z=o%I===0,D=i%T===0,j=h?[_,4,4]:[1,1,1],L=[{type:6,data:r},{type:6,data:o},{type:6,data:i},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];ve(t,L),L.push(...E(e[0].dims,e[1].dims));let q=["rank","rank"];s&&(L.push(...E(e[2].dims)),q.push("rank")),L.push(...E(n));let ae=U=>{let te=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];xe(t,te);let re=h?4:1,V=Q(e[0].dataType),ne=`
      fn setOutputAtIndex(flatIndex : i32, value : ${h?`vec4<${V}>`:V}) {
        result[flatIndex] = ${h?`vec4<${V}>`:V}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${h?`vec4<${V}>`:V}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${h?"/ 4":""}, value);
      }`,F=S("x",e[0].dataType,e[0].dims.length,_===3?1:_),H=S("w",e[1].dataType,e[1].dims.length,re),K=[F,H],k=C("result",e[0].dataType,n.length,re);if(s){let B=S("bias",e[2].dataType,e[2].dims.length,re);K.push(B),ne+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${h?`vec4<${V}>`:V} {
          return bias[coords.${d?"w":"y"}${h?"/ 4":""}];
        }`}return`
        ${Qt("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${U.registerUniforms(te).declareVariables(...K,k)}
        ${ne}
        ${Td(d,P,z,D,s,t,j[0],j[1],j[2],V)}
        ${h?ct(b,g,V,void 0,!d,T):pt(b,g,V,void 0,!d,T,!1,void 0,a)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${_};${h};${P};${z};${D};${x};${I};${T}`,inputDependencies:q},getRunData:()=>({outputs:[{dims:u?u(n):n,dataType:e[0].dataType}],dispatchGroup:{x:$[0],y:$[1],z:$[2]},programUniforms:L}),getShaderSource:ae}}});var Ad,Gi,Jt,kd,Li,Ed,Hi,qi,Fi=A(()=>{"use strict";R();De();N();G();Re();lt();Ad=e=>{let t=1;for(let n=0;n<e.length;n++)t*=e[n];return t},Gi=e=>typeof e=="number"?[e,e,e]:e,Jt=(e,t)=>t<=1?e:e+(e-1)*(t-1),kd=(e,t,n,r=1)=>{let o=Jt(t,r);return Math.floor((e[0]*(n-1)-n+o)/2)},Li=(e,t,n,r,o)=>{o==null&&(o=kd(e,t[0],r[0]));let i=[0,0,0,n];for(let s=0;s<3;s++)e[s]+2*o>=t[s]&&(i[s]=Math.trunc((e[s]-t[s]+2*o)/r[s]+1));return i},Ed=(e,t,n,r,o,i,s,a,u,d)=>{let c,l,p,f;if(e==="VALID"&&(e=0),typeof e=="number"){c={top:e,bottom:e,left:e,right:e,front:e,back:e};let m=Li([t,n,r,1],[a,u,d],1,[o,i,s],e);l=m[0],p=m[1],f=m[2]}else if(Array.isArray(e)){if(!e.every((h,y,w)=>h===w[0]))throw Error(`Unsupported padding parameter: ${e}`);c={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let m=Li([t,n,r,1],[a,u,d],1,[o,i,s],e[0]);l=m[0],p=m[1],f=m[2]}else if(e==="SAME_UPPER"){l=Math.ceil(t/o),p=Math.ceil(n/i),f=Math.ceil(r/s);let m=(l-1)*o+a-t,h=(p-1)*i+u-n,y=(f-1)*s+d-r,w=Math.floor(m/2),g=m-w,b=Math.floor(h/2),$=h-b,_=Math.floor(y/2),x=y-_;c={top:b,bottom:$,left:_,right:x,front:w,back:g}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:c,outDepth:l,outHeight:p,outWidth:f}},Hi=(e,t,n,r,o,i=!1,s="channelsLast")=>{let a,u,d,c,l;if(s==="channelsLast")[a,u,d,c,l]=e;else if(s==="channelsFirst")[a,l,u,d,c]=e;else throw new Error(`Unknown dataFormat ${s}`);let[p,,f,m,h]=t,[y,w,g]=Gi(n),[b,$,_]=Gi(r),x=Jt(f,b),I=Jt(m,$),T=Jt(h,_),{padInfo:P,outDepth:z,outHeight:D,outWidth:j}=Ed(o,u,d,c,y,w,g,x,I,T),L=i?p*l:p,q=[0,0,0,0,0];return s==="channelsFirst"?q=[a,L,z,D,j]:s==="channelsLast"&&(q=[a,z,D,j,L]),{batchSize:a,dataFormat:s,inDepth:u,inHeight:d,inWidth:c,inChannels:l,outDepth:z,outHeight:D,outWidth:j,outChannels:L,padInfo:P,strideDepth:y,strideHeight:w,strideWidth:g,filterDepth:f,filterHeight:m,filterWidth:h,effectiveFilterDepth:x,effectiveFilterHeight:I,effectiveFilterWidth:T,dilationDepth:b,dilationHeight:$,dilationWidth:_,inShape:e,outShape:q,filterShape:t}},qi=(e,t,n,r,o,i)=>{let s=i==="channelsLast",a=s?e[0].dims[3]:e[0].dims[1],u=!1,d=[64,1,1],c={x:n.map((g,b)=>b)},l=[Math.ceil(Ad(c.x.map(g=>n[g]))/d[0]),1,1];J("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${l}`);let p=u?s&&a%4!==0?3:4:1,f=v.size(n),m=[{type:12,data:f},{type:12,data:r},{type:12,data:o},{type:12,data:t.strides},{type:12,data:t.dilations}];ve(t,m),m.push(...E(e[0].dims,e[1].dims));let h=["rank","rank"],y=e.length===3;y&&(m.push(...E(e[2].dims)),h.push("rank")),m.push(...E(n));let w=g=>{let b=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:r.length},{name:"pads",type:"u32",length:o.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];xe(t,b);let $=u?4:1,_=Q(e[0].dataType),x=S("x",e[0].dataType,e[0].dims.length,p===3?1:p),I=S("W",e[1].dataType,e[1].dims.length,$),T=[x,I],P=C("result",e[0].dataType,n.length,$),z="";if(y){let L=S("bias",e[2].dataType,e[2].dims.length,$);T.push(L),z+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${u?`vec4<${_}>`:_} {
          return bias[${s?O("coords",4,5):O("coords",1,5)}${u?"/ 4":""}];
        }`}let D=le(p,_),j=_e(t,D,_);return`
            ${z}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${x.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${I.getByIndices("aIndices")};
            }
          ${g.registerUniforms(b).declareVariables(...T,P)}
          ${g.mainStart()}
          ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${P.offsetToIndices("global_idx")};
              let batch = ${O("coords",0,x.rank)};
              let d2 = ${s?O("coords",x.rank-1,x.rank):O("coords",1,x.rank)};
              let xFRCCorner = vec3<u32>(${s?O("coords",1,x.rank):O("coords",2,x.rank)},
              ${s?O("coords",2,x.rank):O("coords",3,x.rank)},
              ${s?O("coords",3,x.rank):O("coords",4,x.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${s?O("uniforms.x_shape",1,x.rank):O("uniforms.x_shape",2,x.rank)};
              let xShapeZ = ${s?O("uniforms.x_shape",2,x.rank):O("uniforms.x_shape",3,x.rank)};
              let xShapeW = ${s?O("uniforms.x_shape",3,x.rank):O("uniforms.x_shape",4,x.rank)};
              let xShapeU = ${s?O("uniforms.x_shape",4,x.rank):O("uniforms.x_shape",1,x.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = 0.0;
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${s?`let xValues = vec4<f32>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<f32>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<f32>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${s?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${s?`let xValues = vec2<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${s?`let xValues = vec3<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${y?"value = value + getBiasByOutputCoords(coords)":""};
              ${j}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${s};${p};${y}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:l[0],y:l[1],z:l[2]},programUniforms:m}),getShaderSource:w}}});var Ki,ji,Zi=A(()=>{"use strict";R();N();G();Vn();Re();Ki=(e,t,n)=>{let r=e.length>2,o=r?"value += b[output_channel];":"",i=e[0].dims,s=e[1].dims,a=s[0]/t.group,u=t.format==="NHWC",d=en(i,s,t.dilations,t.pads,t.strides,u),c=v.size(d),l=[{type:12,data:c},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:a}];ve(t,l),l.push(...E(i,s));let p=["rank","rank"];r&&(l.push(...E(e[2].dims)),p.push("rank")),l.push(...E(d));let f=m=>{let h=C("output",e[0].dataType,d.length),y=Q(h.type.tensor),w=_e(t,h.type.value,y),g=S("x",e[0].dataType,i.length),b=S("w",e[1].dataType,s.length),$=[g,b];r&&$.push(S("b",e[2].dataType,e[2].dims.length));let _=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];return xe(t,_),`
  ${m.registerUniforms(_).declareVariables(...$,h)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${h.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${u?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${u?1:2}], outputIndices[${u?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel / uniforms.output_channels_per_group;

    var value: ${h.type.value} = ${h.type.value}(0);
    for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
      let input_channel = group_id * uniforms.w_shape[1] + wInChannel;
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[${u?1:2}]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[${u?2:3}]) {
            continue;
          }

          let xVal = ${u?g.get("batch","xHeight","xWidth","input_channel"):g.get("batch","input_channel","xHeight","xWidth")};
          let wVal = ${b.get("output_channel","wInChannel","wHeight","wWidth")};
          value += xVal*wVal;
        }
      }
    }
    ${o}
    ${w}
    ${h.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:t.cacheKey,inputDependencies:p},getRunData:()=>({outputs:[{dims:n?n(d):d,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:l}),getShaderSource:f}},ji=(e,t,n,r)=>{let o=e.length>2,i=ee(n[3]),s=ee(n[2]),a=v.size(n)/i/s,u=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/i],d=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/i],c=[n[0],n[1],n[2],n[3]/i],l=[{type:12,data:a},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];ve(t,l),l.push(...E(u,d,c));let p=(s-1)*t.strides[1]+d[1],f=m=>{let h=C("output",e[0].dataType,c.length,i),y=Q(h.type.tensor),w=_e(t,h.type.value,y),g=S("x",e[0].dataType,u.length,i),b=S("w",e[1].dataType,d.length,i),$=[g,b];o&&$.push(S("b",e[2].dataType,e[2].dims,i));let _=o?"value += b[output_channel];":"",x=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return xe(t,x),`
  ${m.registerUniforms(x).declareVariables(...$,h)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${s}u;
    let col = (index1 % width1) * ${s}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${g.type.value}, ${p}>;
    var values: array<${h.type.value}, ${s}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${d[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${p}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${g.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${g.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${d[1]}; w_width++) {
          let w_val = ${b.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${s}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${s}u; i++) {
      var value = values[i];
      ${_}
      ${w}
      ${h.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${i};${s};${p};${d[0]};${d[1]}`,inputDependencies:o?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:r?r(n):n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:l}),getShaderSource:f}}});var Nn,Pd,Xi,Wn=A(()=>{"use strict";R();N();mt();G();Re();Nn=(e,t,n,r,o=!1,i)=>{let s=e[0].dims,a=e[1].dims,u=s[s.length-2],d=a[a.length-1],c=s[s.length-1],l=ee(d),p=ee(c),f=ee(u),m=v.size(n)/l/f,h=e.length>2,y=r?r.slice(0,-2):n.slice(0,-2),g=[v.size(y),u,d],b=[{type:12,data:m},{type:12,data:u},{type:12,data:d},{type:12,data:c}];ve(t,b),b.push(...E(y,s,a)),h&&b.push(...E(e[2].dims)),b.push(...E(g));let $=_=>{let x=Lt("batch_dims",e[0].dataType,y.length),I=S("a",e[0].dataType,s.length,p),T=S("b",e[1].dataType,a.length,l),P=C("output",e[0].dataType,g.length,l),z=Q(P.type.tensor),D=_e(t,P.type.value,z),j=[I,T],L="";if(h){let F=o?l:1;j.push(S("bias",e[2].dataType,e[2].dims.length,F)),L=`${o?`value += bias[col / ${F}];`:`value += ${P.type.value}(bias[row + i]);`}`}let q=s.slice(0,-2),ae=a.slice(0,-2),U=Ye(q,y),te=Ye(ae,y),re=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];xe(t,re);let V=(F,H)=>{let K=F.rank,k=F.name;if(K===2)return`var ${k}_indices = ${F.type.indices}(0u, 0u);`;let B=x.rank,Y=`var ${k}_indices: ${F.type.indices};`;for(let Te=K-2-1,me=B-1;Te>=0;Te--,me--)Y+=`
${k}_indices[${Te}] = ${B>1?`batch_indices[${me}]`:"batch_indices"};`;return H.forEach(Te=>{Y+=`
${k}_indices[${Te}] = 0;`}),Y+=`${k}_indices[${K-2}] = 0u;
                     ${k}_indices[${K-1}] = 0u;`,Y},ne=()=>{let F=`var a_data: ${I.type.value};`;for(let H=0;H<p;H++)F+=`
              let b_data${H} = b[(b_offset + (k + ${H}) * uniforms.N + col) / ${l}];`;for(let H=0;H<f;H++){F+=`a_data = a[(a_offset + (row + ${H}) * uniforms.K + k) / ${p}];`;for(let K=0;K<p;K++)F+=`
            values[${H}] = fma(${T.type.value}(a_data${p===1?"":`[${K}]`}), b_data${K}, values[${H}]);
`}return F};return`
  ${_.registerUniforms(re).registerInternalVariables(x).declareVariables(...j,P)}
  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${l})) * ${l};
    var index1 = global_idx / (uniforms.N / ${l});
    let stride1 = uniforms.M / ${f};
    let row = (index1 % stride1) * ${f};
    let batch = index1 / stride1;

    ${n.length===2?"":`let batch_indices = ${x.offsetToIndices("batch")};`}
    ${V(I,U)}
    let a_offset = ${I.indicesToOffset("a_indices")};
    ${V(T,te)}
    let b_offset = ${T.indicesToOffset("b_indices")};
    var values: array<${P.type.value}, ${f}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${p}) {
      ${ne()}
    }
    for (var i = 0u; i < ${f}u; i++) {
      var value = values[i];
      ${L}
      ${D}
      let cur_indices = ${P.type.indices}(batch, row + i, col);
      let offset = ${P.indicesToOffset("cur_indices")};
      ${P.setByOffset(`offset / ${l}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${l};${p};${f};${o}`,inputDependencies:h?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(n):n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:b}),getShaderSource:$}},Pd=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},Xi=e=>{Pd(e.inputs);let t=ke.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let n=t[t.length-1],r=e.inputs[0].dims[e.inputs[0].dims.length-1];n<8&&r<8?e.compute(Nn(e.inputs,{activation:""},t)):e.compute(Yt(e.inputs,{activation:""},t))}});var en,Gn,zd,Ln,Hn,Qi,Od,Bd,qn,Vn=A(()=>{"use strict";N();Wi();Fi();mt();Zi();Re();Wn();je();en=(e,t,n,r,o,i)=>{let s=e[0],a=e.slice(i?1:2,i?3:4),u=a.length,d=t[0],l=t.slice(2).map((m,h)=>m+(m-1)*(n[h]-1)),f=a.map((m,h)=>m+r[h]+r[h+u]).map((m,h)=>Math.floor((m-l[h]+o[h])/o[h]));return f.splice(0,0,s),f.splice(i?3:1,0,d),f},Gn=[2,3,1,0],zd=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let n=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],r=e[1].dims[1]*t.group;if(n!==r)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let o=e[0].dims.length-2;if(t.dilations.length!==o)throw new Error(`dilations should be ${o}D`);if(t.strides.length!==o)throw new Error(`strides should be ${o}D`);if(t.pads.length!==o*2)throw new Error(`pads should be ${o*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},Ln=(e,t)=>{let n=e.kernelShape.slice();for(let i=2;i<t[1].dims.length;++i)n[i-2]===0&&(n[i-2]=t[1].dims[i]);let r=e.pads.slice();qe.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,n,r,e.format==="NHWC",e.autoPad);let o=Object.assign({},e);return Object.assign(o,{kernelShape:n,pads:r}),o},Hn=e=>{let t=Zt(e),n=e.format,r=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],o=e.dilations,i=e.group,s=e.kernel_shape,a=e.pads,u=e.strides,d=e.w_is_const();return{autoPad:r,format:n,dilations:o,group:i,kernelShape:s,pads:a,strides:u,wIsConst:d,...t,cacheKey:`${e.format};${t.activation};`}},Qi=(e,t,n,r)=>{let o=n.format==="NHWC";if(n.group!==1){if(!e.adapterInfo.isArchitecture("ampere")&&o&&t[1].dims[0]===n.group&&t[1].dims[1]===1&&n.dilations[0]===1&&n.dilations[1]===1){let I=en(t[0].dims,t[1].dims,n.dilations,n.pads,n.strides,o),T=e.kernelCustomData.wT??e.compute(he(t[1],Gn),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=T);let P=[t[0],T];t.length===3&&P.push(t[2]),e.compute(ji(P,n,I,r),{inputs:P})}else e.compute(Ki(t,n,r));return}let i=t.length===3,s=t[0].dims[o?1:2],a=t[0].dims[o?2:3],u=t[0].dims[o?3:1],d=t[1].dims[2],c=t[1].dims[3],l=en(t[0].dims,t[1].dims,n.dilations,n.pads,n.strides,o),p=l[o?1:2],f=l[o?2:3],m=l[o?3:1],h=o&&d===s&&c===a&&n.pads[0]===0&&n.pads[1]===0;if(h||d===1&&c===1&&n.dilations[0]===1&&n.dilations[1]===1&&n.strides[0]===1&&n.strides[1]===1&&n.pads[0]===0&&n.pads[1]===0){let x=l[0],I,T,P,z=[];if(o){let L=e.kernelCustomData.wT??e.compute(he(t[1],Gn),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];if(n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=L),h){let q=s*a*u;I=t[0].reshape([1,x,q]),T=L.reshape([1,q,m]),P=[1,x,m]}else I=t[0].reshape([x,s*a,u]),T=L.reshape([1,u,m]),P=[x,p*f,m];z.push(I),z.push(T)}else I=t[0].reshape([x,u,s*a]),T=t[1].reshape([1,m,u]),P=[x,m,p*f],z.push(T),z.push(I);i&&z.push(t[2]);let D=P[2],j=z[0].dims[z[0].dims.length-1];D<8&&j<8?e.compute(Nn(z,n,l,P,o,r),{inputs:z}):e.compute(Yt(z,n,l,P,o,r),{inputs:z});return}let y=!0,w=e.kernelCustomData.wT??e.compute(he(t[1],Gn),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=w);let g=[t[0],w];i&&g.push(t[2]);let b=o?p*f:m,$=o?m:p*f,_=d*c*u;e.compute(Ni(g,n,l,b,$,_,i,y,r),{inputs:g})},Od=(e,t)=>{let n=t.format==="NHWC",r=[e.inputs[0].reshape(n?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&r.push(e.inputs[2]);let o=[0,t.pads[0],0,t.pads[1]],i=[1].concat(t.strides),s=[1].concat(t.dilations),a=[1].concat(t.kernelShape),u=Ln({...t,pads:o,strides:i,dilations:s,kernelShape:a},r);Qi(e,r,u,d=>n?[d[0],d[2],d[3]]:[d[0],d[1],d[3]])},Bd=(e,t,n)=>{let r=n.format==="NHWC"?"channelsLast":"channelsFirst",o=Ln(n,t),i=n.autoPad==="NOTSET"?n.pads:n.autoPad,s=Hi(t[0].dims,t[1].dims,n.strides,n.dilations,i,!1,r);e.compute(qi(t,o,s.outShape,[s.filterDepth,s.filterHeight,s.filterWidth],[s.padInfo.front,s.padInfo.top,s.padInfo.left],r))},qn=(e,t)=>{if(zd(e.inputs,t),e.inputs[0].dims.length===3)Od(e,t);else if(e.inputs[0].dims.length===5)Bd(e,e.inputs,t);else{let n=Ln(t,e.inputs);Qi(e,e.inputs,n)}}});var Dd,Yi,Ji=A(()=>{"use strict";R();De();G();Re();lt();Mn();mt();Dd=(e,t=!1,n,r,o=4)=>{let i=w=>{switch(w){case 1:return"return w[getIndexFromCoords4D(coord, vec4<i32>(uniforms.w_shape))];";case 4:return`
            let coord1 = vec4<i32>(coordX, coordY, col + 1, rowInner);
            let coord2 = vec4<i32>(coordX, coordY, col + 2, rowInner);
            let coord3 = vec4<i32>(coordX, coordY, col + 3, rowInner);
            let v0 = w[getIndexFromCoords4D(coord, vec4<i32>(uniforms.w_shape))];
            let v1 = w[getIndexFromCoords4D(coord1, vec4<i32>(uniforms.w_shape))];
            let v2 = w[getIndexFromCoords4D(coord2, vec4<i32>(uniforms.w_shape))];
            let v3 = w[getIndexFromCoords4D(coord3, vec4<i32>(uniforms.w_shape))];
            return ${r}(v0, v1, v2, v3);
            `;default:throw new Error(`innerElementSize ${w} is not supported.`)}},s=e?`
      let coord = vec4<i32>(batch, iXR, iXC, xCh);
      `:`
      let coord = vec4<i32>(batch, xCh, iXR, iXC);
      `,a=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,u=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",d=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",c=e?"row":"col",l=e?"col":"row",p=`
      let inChannels = ${e?"i32(uniforms.x_shape[3])":"i32(uniforms.x_shape[1])"};
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      let outRow = ${c} / outWidth;
      let outCol = ${c} % outWidth;

      let WRow = ${l} / (uniforms.filter_dims[1] * inChannels);
      let WCol = ${l} / inChannels % uniforms.filter_dims[1];
      let xR = f32(outRow - uniforms.pads[0] + uniforms.dilations[0] * WRow) / f32(uniforms.strides[0]);
      let xC = f32(outCol - uniforms.pads[1] + uniforms.dilations[1] * WCol) / f32(uniforms.strides[1]);
      if (xR < 0.0 || xR >= f32(${u}) || fract(xR) > 0.0) {
        return ${r}(0.0);
      }
      if (xC < 0.0 || xC >= f32(${d}) || fract(xC) > 0.0) {
        return ${r}(0.0);
      }
      let iXR = i32(xR);
      let iXC = i32(xC);
      let xCh = ${l} % inChannels;
      ${s}
      return x[getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape))/${o}];`,f=e?`
      let col = colIn * ${o};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
        ${p}
      }
      return ${r}(0.0);`:`
      let col = colIn * ${o};
      if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
        ${p}
      }
      return ${r}(0.0);`,m=`
      let col = colIn * ${o};
      let inChannels = ${e?"i32(uniforms.x_shape[3])":"i32(uniforms.x_shape[1])"};
      let coordX = uniforms.filter_dims[0] - 1 - row / (uniforms.filter_dims[1] * inChannels);
      let coordY = uniforms.filter_dims[1] - 1 - (row / inChannels) % uniforms.filter_dims[1];
      if (${e?"row < uniforms.dim_inner && col < uniforms.dim_b_outer":"row < uniforms.dim_inner && col < uniforms.dim_a_outer"}  && coordX >= 0 && coordY >= 0) {
        let rowInner = row % inChannels;
        let coord = vec4<i32>(coordX, coordY, col, rowInner);
        ${i(o)}
      }
      return ${r}(0.0);
      `,h=_e(n,r);return`
  fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${r} {
    ${e?f:m}
  }

  fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${r} {
    ${e?m:f}
  }

  fn mm_write(batch: i32, row : i32, colIn : i32, valueInput : ${r}) {
    let col = colIn * ${o};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
      var value = valueInput;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${a}
      ${Xt(t)}
      ${h}
      result[getIndexFromCoords4D(coords, vec4<i32>(uniforms.result_shape))/${o}] = value;
    }
  }`},Yi=(e,t,n,r,o,i,s,a)=>{let u=t.format==="NHWC",d=u?e[0].dims[3]:e[0].dims[1],c=n[0],l=u?n[2]:n[3],p=u?n[1]:n[2],f=u?n[3]:n[1],m=u&&d%4===0&&d%3&&f%4===0,h=u?f:l*p,y=u?l*p:f,w=[8,8,1],g=r<=8?[4,1,1]:[4,4,1],b=[Math.ceil(h/w[0]/g[0]),Math.ceil(y/w[1]/g[1]),Math.ceil(c/w[2]/g[2])];J("verbose",()=>`[conv_backprop_mm_webgpu] dispatch = ${b}`);let $=m?4:1,_=Math.max(w[0]*$,w[1]),x=m?4:1,I=[t.kernelShape[u?1:2],t.kernelShape[u?2:3]],T=[I[0]+(t.dilations[0]<=1?0:(I[0]-1)*(t.dilations[0]-1)),I[1]+(t.dilations[1]<=1?0:(I[1]-1)*(t.dilations[1]-1))],P=[T[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),T[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],z=[{type:6,data:r},{type:6,data:o},{type:6,data:i},{type:6,data:t.strides},{type:6,data:t.dilations},{type:6,data:I},{type:6,data:P}];ve(t,z),z.push(...E(e[0].dims,e[1].dims));let D=["rank","rank"];s&&(z.push(...E(e[2].dims)),D.push("rank")),z.push(...E(n));let j=L=>{let q=S("x",e[0].dataType,e[0].dims.length,x),ae=S("w",e[1].dataType,e[1].dims.length,1),U=C("result",e[0].dataType,n.length,x),te=[q,ae],re="";if(s){let F=S("bias",e[2].dataType,e[2].dims.length,x);te.push(F),re+=`
          fn getBiasByOutputCoords(coords : vec4<i32>) -> ${F.type.value} {
            return bias[coords.${u?"w":"y"}${m?"/ 4":""}];
          }`}let V=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"strides",type:"i32",length:2},{name:"dilations",type:"i32",length:2},{name:"filter_dims",type:"i32",length:I.length},{name:"pads",type:"i32",length:P.length}];xe(t,V);let ne=Q(e[0].dataType,1);if(ne!=="f16"&&ne!=="f32")throw new Error(`elemType ${ne} is not supported.`);return`
        ${Qt("uniforms.result_strides")}
        ${L.registerUniforms(V).declareVariables(...te,U)};
        ${re}
        ${Dd(u,s,t,q.type.value,$)}
        ${m?ct(g,w,ne,void 0,!u,_):pt(g,w,ne,void 0,!u,_,!1,void 0,a)}`};return{name:"Conv2DTransposeMatMul",shaderCache:{hint:`${t.cacheKey};${g};${w};${m}`,inputDependencies:D},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:b[0],y:b[1],z:b[2]},programUniforms:z}),getShaderSource:j}}});var Rd,Fn,es=A(()=>{"use strict";R();De();N();G();Rd=(e,t,n,r,o,i=!1,s,a,u=!1)=>{let d=u?1:2,c=u?2:3,l=u?3:1,p=i?2:1,f=`
  fn setOutputAtIndex(flatIndex : u32, value : ${i?`vec4<${s}>`:s}) {
    result[flatIndex] = ${i?`vec4<${s}>`:s}(value);
  }`;r&&(f+=`
    fn getBiasByOutputCoords(coords : vec4<u32>) -> ${i?`vec4<${s}>`:s} {
      return bias[coords.${u?"w":"y"}${i?"/ 4":""}];
    }`);let m=i?4:1,h=S("W",t[1].dataType,t[1].dims.length,m),y=S("Dy",t[0].dataType,t[0].dims.length,m),w=[y,h];r&&w.push(S("bias",t[2].dataType,[n[l]].length,m));let g=C("result",t[0].dataType,n.length,m),b=`{
        let batch: u32 = ${o?"global_id.z":"workgroup_id.z"} / uniforms.result_shape[1];
        let r = ${o?"global_id.z":"workgroup_id.z"} % uniforms.result_shape[1];
        let c = ${o?"global_id.y":"workgroup_id.y"} * ${p};
        let d1: u32 = ${o?"global_id.x":"workgroup_id.x"} * 4;

        let dyCorner = vec2<i32>(i32(r), i32(c)) - vec2<i32>(uniforms.pads);

        // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
        // ? = to be determined. : = across all values in that axis.
        var dotProd: array<vec4<${s}>, ${p}>;
        for (var i = 0; i < ${p}; i++) {
          dotProd[i] = vec4<${s}>(0.0);
        }
        for (var wR: u32 = 0; wR < uniforms.filter_dims[0]; wR = wR + 1) {
          var dyR = (${s}(dyCorner.x) + ${s}(wR)) / ${s}(uniforms.strides.x);
          let wRPerm = uniforms.filter_dims[0] - 1 - wR;
          if (dyR < 0.0 || dyR >= ${s}(uniforms.Dy_shape[1]) ||
              fract(dyR) > 0.0 || wRPerm < 0) {
            continue;
          }
          let idyR: u32 = u32(dyR);

          for (var wC: u32 = 0; wC < uniforms.filter_dims[1]; wC = wC + 1) {
            let dyC = (${s}(dyCorner.y) + ${s}(wC)) / ${s}(uniforms.strides.y);
            let dyC2 = (${s}(dyCorner.y) + 1.0 + ${s}(wC)) / ${s}(uniforms.strides.y);
            let wCPerm = uniforms.filter_dims[1] - 1 - wC;
            if (wCPerm < 0) {
              continue;
            }
            var bDyCVal = true;
            var bDyCVal2 = true;
            if (dyC < 0.0 || dyC >= ${s}(uniforms.Dy_shape[2]) ||
                fract(dyC) > 0.0) {
              bDyCVal = false;
            }
            if (dyC2 < 0.0 || dyC2 >= ${s}(uniforms.Dy_shape[2]) ||
                fract(dyC2) > 0.0) {
              bDyCVal2 = false;
            }

            let idyC: u32 = u32(dyC);
            let idyC2: u32 = u32(dyC2);
            if (bDyCVal && bDyCVal2) {
              let d2Length = uniforms.Dy_shape[3];
              for (var d2 :u32 = 0; d2 < d2Length; d2 = d2 + 4) {
                let wValue0 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1","d2")};
                let wValue1 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 1","d2")};
                let wValue2 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 2","d2")};
                let wValue3 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 3","d2")};

                var xValue = ${y.get("batch","idyR","idyC","d2")};
                let tmpval = vec4<${s}>(dot(xValue, wValue0),
                                      dot(xValue, wValue1),
                                      dot(xValue, wValue2),
                                      dot(xValue, wValue3));
                dotProd[0] = dotProd[0] + tmpval;

                xValue =  ${y.get("batch","idyR","idyC2","d2")};

                dotProd[1] = dotProd[1] + vec4<${s}>(dot(xValue, wValue0),
                                                    dot(xValue, wValue1),
                                                    dot(xValue, wValue2),
                                                    dot(xValue, wValue3));
              }
            } else if (bDyCVal) {
              let d2Length = uniforms.Dy_shape[${l}];
              for (var d2: u32 = 0; d2 < d2Length; d2 = d2 + 4) {
                let wValue0 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1","d2")};
                let wValue1 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 1","d2")};
                let wValue2 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 2","d2")};
                let wValue3 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 3","d2")};

                var xValue = ${y.get("batch","idyR","idyC","d2")};
                let tmpval = vec4<${s}>(dot(xValue, wValue0),
                                      dot(xValue, wValue1),
                                      dot(xValue, wValue2),
                                      dot(xValue, wValue3));
                dotProd[0] = dotProd[0] + tmpval;
              }
            } else if (bDyCVal2) {
              let d2Length = uniforms.Dy_shape[3];
              for (var d2: u32 = 0; d2 < d2Length; d2 = d2 + 4) {
                let wValue0 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1","d2")};
                let wValue1 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 1","d2")};
                let wValue2 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 2","d2")};
                let wValue3 = ${h.get("u32(wRPerm)","u32(wCPerm)","d1 + 3","d2")};

                var xValue = ${y.get("batch","idyR","idyC2","d2")};
                let tmpval = vec4<${s}>(dot(xValue, wValue0),
                                      dot(xValue, wValue1),
                                      dot(xValue, wValue2),
                                      dot(xValue, wValue3));
                dotProd[1] = dotProd[1] + tmpval;
              }
            }
          }
        }

        for (var i: u32 = 0; i < ${p}; i = i + 1) {
          let value = dotProd[i] + ${r?"bias[c+i]":`vec4<${s}>(0.0)`};
          ${g.set("batch","r","c + i","d1","value")};
        }
      }`,$=`
          let outputIndices = ${g.offsetToIndices("global_idx")};
          let batch = ${g.indicesGet("outputIndices",0)};
          let d1 = ${g.indicesGet("outputIndices",l)};
          let r = ${g.indicesGet("outputIndices",d)};
          let c = ${g.indicesGet("outputIndices",c)};
          let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
          let dyRCorner = dyCorner.x;
          let dyCCorner = dyCorner.y;
          let groupId = d1 / uniforms.output_channels_per_group;
          let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
          // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
          // ? = to be determined. : = across all values in that axis.
          var dotProd = ${s}(0.0);
          for (var wR: u32 = 0; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
            if (wR % uniforms.dilations.x != 0) {
              continue;
            }
            let dyR = (${s}(dyRCorner) + ${s}(wR)) / ${s}(uniforms.strides[0]);
            let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
            if (dyR < 0.0 || dyR >= ${s}(uniforms.Dy_shape[${d}]) || fract(dyR) > 0.0 ||
                wRPerm < 0) {
              continue;
            }
            let idyR: u32 = u32(dyR);

            for (var wC: u32 = 0; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
              if (wC % uniforms.dilations.y != 0) {
                continue;
              }
              let dyC = (${s}(dyCCorner) + ${s}(wC)) / ${s}(uniforms.strides.y);
              let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
              if (dyC < 0.0 || dyC >= ${s}(uniforms.Dy_shape[${c}]) ||
                  fract(dyC) > 0.0 || wCPerm < 0) {
                continue;
              }
              let idyC: u32 = u32(dyC);
              var inputChannel = groupId * uniforms.input_channels_per_group;
              for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group; d2 = d2 + 1) {
                let xValue = ${u?y.get("batch","idyR","idyC","inputChannel"):y.get("batch","inputChannel","idyR","idyC")};
                let wValue = ${h.get("inputChannel","wOutChannel","u32(wRPerm)","u32(wCPerm)")};
                dotProd = dotProd + xValue * wValue;
                inputChannel = inputChannel + 1;
              }
            }
          }
          let value = dotProd + ${r?"bias[d1]":`${s}(0.0)`};
          ${g.setByOffset("global_idx","value")};
        `;return`
  ${e.registerUniforms(a).declareVariables(...w,g)}
  ${f}

    ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
  ${i?b:$}}`},Fn=(e,t,n)=>{let r=e.length>2,o=t.outputShape,i=v.size(o),s=[Math.ceil(i/64),1,1];J("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${s}`);let a=t.format==="NHWC",u=["rank","rank"],d=[t.strides[0],t.strides[1]],c=[t.kernelShape[a?1:2],t.kernelShape[a?2:3]],l=[t.dilations[0],t.dilations[1]],p=[c[0]+(t.dilations[0]<=1?0:(t.kernelShape[a?1:2]-1)*(t.dilations[0]-1)),c[1]+(t.dilations[1]<=1?0:(t.kernelShape[a?2:3]-1)*(t.dilations[1]-1))],f=[p[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),p[1]-1-Math.floor(t.pads[1]+t.pads[3])/2],m=!1,h=t.group,y=e[1].dims,w=y[0]/h,g=y[1],b=[{type:12,data:i},{type:12,data:d},{type:12,data:c},{type:12,data:l},{type:12,data:p},{type:6,data:f},{type:12,data:w},{type:12,data:g},...E(e[0].dims,e[1].dims)];r&&(b.push(...E(e[2].dims)),u.push("rank")),b.push(...E(o));let $=s[1]===1&&s[2]===1,_=x=>{let I=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:d.length},{name:"filter_dims",type:"u32",length:c.length},{name:"dilations",type:"u32",length:c.length},{name:"effective_filter_dims",type:"u32",length:p.length},{name:"pads",type:"i32",length:f.length},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],T=Q(e[0].dataType);return`${Rd(x,e,o,r,$,m,T,I,a)}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};`,inputDependencies:u},getRunData:()=>({dispatchGroup:{x:s[0],y:s[1],z:s[2]},outputs:[{dims:n?n(o):o,dataType:e[0].dataType}],programUniforms:b}),getShaderSource:_}}});var Ud,Md,Vd,ts,ns,Nd,Wd,Gd,Ld,rs,os=A(()=>{"use strict";Ji();es();Re();je();Ud=(e,t,n,r,o,i)=>(e-1)*t+n+(r-1)*o+1-i,Md=(e,t,n,r,o)=>{let i=Math.floor(e/2);t==="SAME_UPPER"?(n[r]=i,n[o]=e-i):t==="SAME_LOWER"&&(n[r]=e-i,n[o]=i)},Vd=(e,t,n,r,o,i,s,a,u,d)=>{let c=e.length-2,l=d.length===0;if(u.length===0)for(let m=0;m<c;++m)u.push(0);let p=e[0],f=t[a?3:1]*o;for(let m=0,h=e.length-c-(a?1:0);m<c;++m,++h){let y=e[h],w=l?y*s[m]:d[m],g=Ud(y,s[m],i[m],t[h],n[m],w);Md(g,r,i,m,m+c),l&&d.push(s[m]*(y-1)+u[m]+(t[h]-1)*n[m]+1-i[m]-i[m+c])}d.splice(0,0,p),d.splice(a?3:1,0,f)},ts=(e,t)=>{let n=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((l,p)=>l*p,1)===0){n.length=0;for(let l=2;l<t[1].dims.length;++l)n.push(t[1].dims[l])}let r=e.format==="NHWC";n.splice(0,0,t[1].dims[0]),n.splice(r?3:1,0,t[1].dims[1]);let o=e.pads.slice(),i=e.outputShape.slice(),s=e.outputPadding.slice(),a=t[0].dims,u=e.dilations.slice();if(u.reduce((l,p)=>l+p,0)===0){let l=t[0].dims.length-2;u=new Array(l).fill(1)}let d=e.strides.slice();if(d.reduce((l,p)=>l+p,0)===0){let l=t[0].dims.length-2;d=new Array(l).fill(1)}Vd(a,n,u,e.autoPad,e.group,o,d,r,s,i);let c=Object.assign({},e);return Object.assign(c,{kernelShape:n,pads:o,outputPadding:s,outputShape:i,dilations:u,strides:d}),c},ns=e=>{let t=Zt(e),n=e.format,r=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],o=e.dilations,i=e.group,s=e.kernelShape,a=e.pads,u=e.strides,d=e.wIsConst(),c=e.outputPadding,l=e.outputShape;return{autoPad:r,format:n,dilations:o,group:i,kernelShape:s,outputPadding:c,outputShape:l,pads:a,strides:u,wIsConst:d,...t,cacheKey:`${e.format};${t.activation};`}},Nd=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let n=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],r=e[1].dims[0];if(n!==r)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let o=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==o))throw new Error("invalid bias");let i=e[0].dims.length-2;if(t.dilations.reduce((c,l)=>c+l,0)>0&&t.dilations.length!==i)throw new Error(`dilations should be ${i}D`);if(t.strides.reduce((c,l)=>c+l,0)>0&&t.strides.length!==i)throw new Error(`strides should be ${i}D`);if(t.pads.reduce((c,l)=>c+l,0)>0&&t.pads.length!==i*2)throw new Error(`pads should be ${i*2}D`);if(t.outputPadding.length!==i&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${i}D`);if(t.kernelShape.reduce((c,l)=>c+l,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},Wd=[2,3,1,0],Gd=(e,t,n)=>{let r=ts(n,t),o=n.format==="NHWC",i=r.outputShape,s=i[o?3:1],a=t[0].dims[o?3:1];if(r.group!==1||s===1&&a===1){e.compute(Fn(t,r));return}let u=i[o?1:2],d=i[o?2:3],c=t[1].dims[2],l=t[1].dims[3],p=o?u*d:s,f=o?s:u*d,m=c*l*a,h=!0,y=e.kernelCustomData.wT??e.compute(he(t[1],Wd),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=y);let w=[t[0],y],g=t.length===3;g&&(!o&&t[2].dims.length===1?w.push(t[2].reshape([t[2].dims[0],1,1])):w.push(t[2])),e.compute(Yi(w,r,i,p,f,m,g,h),{inputs:w})},Ld=(e,t)=>{let n=t.format==="NHWC",r=[e.inputs[0].reshape(n?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&r.push(e.inputs[2]);let o=t.kernelShape;(o.length===0||o[0]===0)&&(o=[e.inputs[1].dims[2]]);let i=t.dilations;(i.length===0||i[0]===0)&&(i=[1]);let s=t.strides;(s.length===0||s[0]===0)&&(s=[1]);let a=t.pads;a.length===0&&(a=[0,0]),a=[0,a[0],0,a[1]],s=[1].concat(s),i=[1].concat(i),o=[1].concat(o);let u=ts({...t,pads:a,strides:s,dilations:i,kernelShape:o},r);e.compute(Fn(r,u,d=>n?[d[0],d[2],d[3]]:[d[0],d[1],d[3]]))},rs=(e,t)=>{Nd(e.inputs,t),e.inputs[0].dims.length===3?Ld(e,t):Gd(e,e.inputs,t)}});var Hd,is,ss,as=A(()=>{"use strict";R();N();ie();G();Hd=(e,t,n,r)=>{let o=v.size(t),i=t.length,s=S("input",e,i),a=C("output",e,i),u=n.dataType===6?n.getInt32Array()[0]:Number(n.getBigInt64Array()[0]),d=v.normalizeAxis(u,i),c=l=>{let p=` i32(${s.indicesGet("inputIndices","uniforms.axis")}) `,f=O("uniforms.input_shape","uniforms.axis",i),m=r.reverse?p+(r.exclusive?" + 1":""):"0",h=r.reverse?f:p+(r.exclusive?"":" + 1");return`
                ${l.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(s,a)}
                ${l.mainStart()}
                  ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${a.offsetToIndices("global_idx")};
                  var sum = ${a.type.value}(0);
                  let first : i32 = ${m};
                  let last : i32 = ${h};
                  for (var i : i32 = first; i < last; i++) {
                    ${s.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${s.getByIndices("inputIndices")};
                  }
                  ${a.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:r.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:[{type:12,data:o},{type:12,data:d},...E(t,t)]}),getShaderSource:c}},is=(e,t)=>{let n=e.inputs[0].dims,r=e.inputs[0].dataType,o=e.inputs[1];e.compute(Hd(r,n,o,t),{inputs:[0]})},ss=e=>{let t=e.exclusive===1,n=e.reverse===1;return M({exclusive:t,reverse:n})}});var qd,Fd,Kd,us,ds,ls=A(()=>{"use strict";R();N();ie();G();qd=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},Fd=(e,t,n,r)=>{let o=[];o.push(`fn perm(i: ${r.type.indices}) -> ${n.type.indices} {
    var a: ${n.type.indices};`);for(let i=0;i<t;++i)o.push(n.indicesSet("a",e[i],`i[${i}]`));return o.push("return a;}"),o.join(`
`)},Kd=(e,t)=>{let n,r,o,i,s,a,u=t.format==="NHWC",d=t.blocksize,c=t.mode==="DCR";u?([n,r,o,i]=e.dims,s=c?[n,r,o,d,d,i/d**2]:[n,r,o,i/d**2,d,d],a=c?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([n,r,o,i]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],s=c?[n,d,d,i/d**2,r,o]:[n,i/d**2,d,d,r,o],a=c?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let l=e.reshape(s),p=l.dims.length,f=e.dataType,m=S("a",f,p),h=C("output",f,p),y=w=>`
  ${w.registerUniform("output_size","u32").declareVariables(m,h)}

  ${Fd(a,p,m,h)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${h.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${h.setByOffset("global_idx",m.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:w=>{let g=u?[n,r*d,o*d,i/d**2]:[n,i/d**2,r*d,o*d],b=v.size(g),$=l.dims,_=v.sortBasedOnPerm($,a);return{outputs:[{dims:g,dataType:w[0].dataType}],dispatchGroup:{x:Math.ceil(b/64)},programUniforms:[{type:12,data:b},...E($,_)]}},getShaderSource:y}},us=(e,t)=>{qd(e.inputs),e.compute(Kd(e.inputs[0],t))},ds=e=>M({blocksize:e.blocksize,mode:e.mode,format:e.format})});var Kn,tn,cs,jd,Zd,jn,Zn,ps,Xd,ms,fs,hs=A(()=>{"use strict";R();N();ie();G();Kn="[a-zA-Z]|\\.\\.\\.",tn="("+Kn+")+",cs="^"+tn+"$",jd="("+tn+",)*"+tn,Zd="^"+jd+"$",jn=class{constructor(t=-1){this.symbolToIndices=new Map,this.inputIndex=t}addSymbol(t,n){let r=this.symbolToIndices.get(t);r===void 0?r=[n]:r.push(n),this.symbolToIndices.set(t,r)}},Zn=class{constructor(t,n){this.equation=n;this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[r,o]=n.includes("->")?n.split("->",2):[n,""];if(!r.match(RegExp(Zd)))throw new Error("Invalid LHS term");if(r.split(",").forEach((a,u)=>{let d=t[u].dims.slice();if(!a.match(RegExp(cs)))throw new Error("Invalid LHS term");let c=this.processTerm(a,!0,d,u);this.lhs.push(c)}),o==="")o+=[...this.symbolToInfo.entries()].filter(([a,u])=>u.count===1||a==="...").map(([a])=>a).join("");else if(!o.match(RegExp(tn)))throw new Error("Invalid RHS");o.match(RegExp(Kn,"g"))?.forEach(a=>{if(a==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let u=this.symbolToInfo.get(a);if(u===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(u.dimValue)}}),this.rhs=this.processTerm(o,!1,this.outputDims)}addSymbol(t,n,r){let o=this.symbolToInfo.get(t);if(o!==void 0){if(o.dimValue!==n&&o.count!==1)throw new Error("Dimension mismatch");o.count++,o.inputIndices.push(r)}else o={count:1,dimValue:n,inputIndices:[r]};this.symbolToInfo.set(t,o)}processTerm(t,n,r,o=-1){let i=r.length,s=!1,a=[],u=0;if(!t.match(RegExp(cs))&&!n&&t!=="")throw new Error("Invalid LHS term");let d=t.match(RegExp(Kn,"g")),c=new jn(o);return d?.forEach((l,p)=>{if(l==="..."){if(s)throw new Error("Only one ellipsis is allowed per input term");s=!0;let f=i-d.length+1;if(f<0)throw new Error("Ellipsis out of bounds");if(a=r.slice(u,u+f),this.hasEllipsis){if(this.ellipsisDims.length!==a.length||this.ellipsisDims.toString()!==a.toString())throw new Error("Ellipsis dimensions mismatch")}else if(n)this.hasEllipsis=!0,this.ellipsisDims=a;else throw new Error("Ellipsis must be specified in the LHS");for(let m=0;m<a.length;m++){let h=String.fromCharCode("0".charCodeAt(0)+m);c.addSymbol(h,p+m),this.addSymbol(h,r[u++],o)}}else c.addSymbol(l,p+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(l,r[u++],o)}),c}},ps=e=>e+"_max",Xd=(e,t,n,r)=>{let i=e.map(c=>c.length).map((c,l)=>S(`input${l}`,t,c)),s=v.size(r),a=C("output",t,r.length),u=[...n.symbolToInfo.keys()].filter(c=>!n.rhs.symbolToIndices.has(c)),d=c=>{let l=[],p="var prod = 1.0;",f="var sum = 0.0;",m="sum += prod;",h=[],y=[],w=[],g=[],b=n.symbolToInfo.size===n.rhs.symbolToIndices.size;n.symbolToInfo.forEach((_,x)=>{if(n.rhs.symbolToIndices.has(x)){let I=n.rhs.symbolToIndices.get(x)?.[0];I!==void 0&&n.lhs.forEach((T,P)=>{if(_.inputIndices.includes(P)){let z=T.symbolToIndices.get(x);if(z===void 0)throw new Error("Invalid symbol error");z.forEach(D=>{l.push(`${i[P].indicesSet(`input${P}Indices`,D,a.indicesGet("outputIndices",I))}`)})}})}else n.lhs.forEach((I,T)=>{if(_.inputIndices.includes(T)){let P=I.symbolToIndices.get(x);if(P===void 0)throw new Error("Invalid symbol error");P.forEach(z=>{h.push(`${i[T].indicesSet(`input${T}Indices`,z,`${x}`)}`)}),g.push(`prod *= ${i[T].getByIndices(`input${T}Indices`)};`)}}),y.push(`for(var ${x}: u32 = 0; ${x} < uniforms.${ps(x)}; ${x}++) {`),w.push("}")});let $=b?[...l,`let sum = ${i.map((_,x)=>_.getByIndices(`input${x}Indices`)).join(" * ")};`]:[...l,f,...y,...h,p,...g,m,...w];return`
            ${c.registerUniforms(u.map(_=>({name:`${ps(_)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...i,a)}

            ${c.mainStart()}
            ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${a.offsetToIndices("global_idx")};
            ${i.map((_,x)=>`var input${x}Indices: ${i[x].type.indices};`).join(`
`)}
            ${$.join(`
`)};
            ${a.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:n.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let c=u.filter(p=>n.symbolToInfo.has(p)).map(p=>({type:12,data:n.symbolToInfo.get(p)?.dimValue||0}));c.push({type:12,data:s});let l=e.map((p,f)=>[...E(p)]).reduce((p,f)=>p.concat(f),c);return l.push(...E(r)),{outputs:[{dims:r,dataType:t}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:l}},getShaderSource:d}},ms=(e,t)=>{let n=new Zn(e.inputs,t.equation),r=n.outputDims,o=e.inputs.map((i,s)=>i.dims);e.compute(Xd(o,e.inputs[0].dataType,n,r))},fs=e=>{let t=e.equation.replace(/\s+/g,"");return M({equation:t})}});var Qd,gs,Yd,Jd,ys,bs=A(()=>{"use strict";R();N();G();Qd=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,n=Array.from(e[1].getBigInt64Array(),Number),r=n.length<t.length?0:n.length-t.length,o=t.length<n.length?0:t.length-n.length;for(;r<n.length&&o<t.length;++r,++o)if(n[r]!==t[o]&&n[r]!==1&&t[o]!==1)throw new Error("Expand requires shape to be broadcastable to input")},gs=(e,t)=>{let n=e.length-t.length,r=[];for(let o=0;o<n;++o)r.push(e[o]);for(let o=0;o<t.length;++o)r.push(t[o]===1?e[o+n]:t[o]);return r},Yd=(e,t)=>e.length>t.length?gs(e,t):gs(t,e),Jd=e=>{let t=e[0].dims,n=Array.from(e[1].getBigInt64Array(),Number),r=Yd(t,n),o=e[0].dataType,i=o===9?4:1,s=Math.ceil(v.size(r)/i),a=d=>{let c=S("input",o,t.length,i),l=C("output",o,r.length,i),p;if(o===9){let f=(m,h,y="")=>`
          let outputIndices${h} = ${l.offsetToIndices(`outputOffset + ${h}u`)};
          let offset${h} = ${c.broadcastedIndicesToOffset(`outputIndices${h}`,l)};
          let index${h} = offset${h} / 4u;
          let component${h} = offset${h} % 4u;
          ${m}[${h}] = ${y}(${c.getByOffset(`index${h}`)}[component${h}]);
        `;p=`
        let outputOffset = global_idx * ${i};
        var data = vec4<u32>(0);
        ${f("data",0,"u32")}
        ${f("data",1,"u32")}
        ${f("data",2,"u32")}
        ${f("data",3,"u32")}
        ${l.setByOffset("global_idx","data")}
      }`}else p=`
        let outputIndices = ${l.offsetToIndices("global_idx")};
        let inputOffset = ${c.broadcastedIndicesToOffset("outputIndices",l)};
        ${l.setByOffset("global_idx",c.getByOffset("inputOffset"))}
      }`;return`
    ${d.registerUniform("vec_size","u32").declareVariables(c,l)}
    ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${p}`},u=[{type:12,data:s},...E(t,r)];return{name:"Expand",shaderCache:{hint:`${r.length}`,inputDependencies:["rank"]},getShaderSource:a,getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:u})}},ys=e=>{Qd(e.inputs),e.compute(Jd(e.inputs),{inputs:[0]})}});var el,ws,$s=A(()=>{"use strict";R();N();G();jt();el=e=>{let t=e[0].dataType,n=v.size(e[0].dims),r=v.size(e[1].dims),o=r%4===0,i=s=>{let a=S("x",t,[1],4),u=S("bias",t,[1],4),d=C("y",t,[1],4),c=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],l=f=>`
      let bias${f}_offset: u32 = (global_idx * 4 + ${f}) % uniforms.bias_size;
      let bias${f} = ${u.getByOffset(`bias${f}_offset / 4`)}[bias${f}_offset % 4];`,p=o?`
      let bias = ${u.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${l(0)}${l(1)}${l(2)}${l(3)}
      let bias = ${a.type.value}(bias0, bias1, bias2, bias3);`;return`${s.registerUniforms(c).declareVariables(a,u,d)}

    ${Rn(de(t))}

    ${s.mainStart(Fe)}
      ${s.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${a.getByOffset("global_idx")};
      ${p}
      let x_in = x + bias;
      ${d.setByOffset("global_idx",Un("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${o}`,inputDependencies:["type","type"]},getShaderSource:i,getRunData:s=>({outputs:[{dims:s[0].dims,dataType:s[0].dataType}],programUniforms:[{type:12,data:Math.ceil(n/4)},{type:12,data:r}],dispatchGroup:{x:Math.ceil(n/Fe/4)}})}},ws=e=>{e.inputs.length<2||v.size(e.inputs[1].dims)===0?bi(e):e.compute(el(e.inputs))}});var tl,nl,_s,vs,xs=A(()=>{"use strict";R();N();ie();G();tl=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},nl=(e,t)=>{let n=e[0].dims,r=e[1].dims,o=n.length,i=v.normalizeAxis(t.axis,o),s=n.slice(0);s.splice(i,1,...r);let a=n[i],u=e[0].dataType===9?4:1,d=Math.ceil(v.size(s)/u),c=[{type:12,data:d},{type:6,data:a},{type:12,data:i},...E(e[0].dims,e[1].dims,s)],l=p=>{let f=S("data",e[0].dataType,e[0].dims.length,u),m=S("inputIndices",e[1].dataType,e[1].dims.length),h=C("output",e[0].dataType,s.length,u),y=g=>{let b=r.length,$=`var indicesIndices${g}  = ${m.type.indices}(0);`;for(let _=0;_<b;_++)$+=`${b>1?`indicesIndices${g}[${_}]`:`indicesIndices${g}`} = ${s.length>1?`outputIndices${g}[uniforms.axis + ${_}]`:`outputIndices${g}`};`;$+=`
          var idx${g} = ${m.getByIndices(`indicesIndices${g}`)};
          if (idx${g} < 0) {
            idx${g} = idx${g} + uniforms.axisDimLimit;
          }
          var dataIndices${g} : ${f.type.indices};
        `;for(let _=0,x=0;_<o;_++)_===i?($+=`${o>1?`dataIndices${g}[${_}]`:`dataIndices${g}`} = u32(idx${g});`,x+=b):($+=`${o>1?`dataIndices${g}[${_}]`:`dataIndices${g}`} = ${s.length>1?`outputIndices${g}[${x}]`:`outputIndices${g}`};`,x++);return $},w;if(e[0].dataType===9){let g=(b,$,_="")=>`
          let outputIndices${$} = ${h.offsetToIndices(`outputOffset + ${$}u`)};
          ${y($)};
          let offset${$} = ${f.indicesToOffset(`dataIndices${$}`)};
          let index${$} = offset${$} / 4u;
          let component${$} = offset${$} % 4u;
          ${b}[${$}] = ${_}(${f.getByOffset(`index${$}`)}[component${$}]);
        `;w=`
        let outputOffset = global_idx * ${u};
        var value = vec4<u32>(0);
        ${g("value",0,"u32")}
        ${g("value",1,"u32")}
        ${g("value",2,"u32")}
        ${g("value",3,"u32")}
        ${h.setByOffset("global_idx","value")}
      `}else w=`
      let outputIndices = ${h.offsetToIndices("global_idx")};
      ${y("")};
      let value = ${f.getByIndices("dataIndices")};
      ${h.setByOffset("global_idx","value")};
      `;return`
      ${p.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(f,m,h)}
      ${p.mainStart()}
        ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${w}
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:s,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:c}),getShaderSource:l}},_s=e=>M({axis:e.axis}),vs=(e,t)=>{let n=e.inputs;tl(n),e.compute(nl(e.inputs,t))}});var rl,ol,Ss,Is,Cs=A(()=>{"use strict";R();N();ie();G();rl=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let n=v.normalizeAxis(t.quantizeAxis,e[0].dims.length),r=t.blockSize,o=e[0],i=e[2],s=e.length===4?e[3]:void 0;if(i.dims.length!==o.dims.length||!o.dims.map((a,u)=>u===n?Math.ceil(a/r)===i.dims[u]:a===i.dims[u]).reduce((a,u)=>a&&u,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(s){if(s.dataType!==o.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(s.dims.length!==i.dims.length||!s.dims.map((a,u)=>a===i.dims[u]).reduce((a,u)=>a&&u,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},ol=(e,t)=>{let n=e[0].dims,r=e[1].dims,o=n.length,i=v.normalizeAxis(t.gatherAxis,o),s=v.normalizeAxis(t.quantizeAxis,o),a=n.slice(0);a.splice(i,1,...r);let u=v.size(a),d=e[2].dataType,l=e[0].dataType===22,p=[{type:12,data:u},{type:12,data:s},{type:12,data:i},{type:12,data:t.blockSize},...E(...e.map((m,h)=>m.dims),a)],f=m=>{let h=S("data",e[0].dataType,e[0].dims.length),y=S("inputIndices",e[1].dataType,e[1].dims.length),w=S("scales",e[2].dataType,e[2].dims.length),g=e.length>3?S("zeroPoint",e[3].dataType,e[3].dims.length):void 0,b=C("output",d,a.length),$=[h,y,w];g&&$.push(g);let _=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${m.registerUniforms(_).declareVariables(...$,b)}
        ${m.mainStart()}
        let output_indices = ${b.offsetToIndices("global_idx")};
        var indices_indices = ${y.type.indices}(0);
        ${(()=>r.length>1?`
          for (var i: u32 = 0; i < ${r.length}; i++) {
            let index = ${b.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${y.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${b.indicesGet("output_indices","uniforms.gather_axis")};`)()};
        var data_indices = ${h.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${b.indicesGet("output_indices","i")};
          ${h.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${y.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${n[i]};
        }
        ${h.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${a.length}; i++) {
          let index = ${b.indicesGet("output_indices",`i + ${r.length} - 1`)};
          ${h.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${h.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${h.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${l?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${w.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${w.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${w.getByIndices("scale_indices")};
        ${(()=>g?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${g.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${g.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${l?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0")()};
        let dequantized_data = ${de(d)}(quantized_data - zero_point) * scale;
        ${b.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((m,h)=>h!==1).map(m=>m.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(m,h)=>"rank")},getRunData:()=>({outputs:[{dims:a,dataType:d}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:p}),getShaderSource:f}},Ss=(e,t)=>{let n=e.inputs;rl(n,t),e.compute(ol(e.inputs,t))},Is=e=>M({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})});var il,sl,Ts,As,ks=A(()=>{"use strict";R();N();ie();G();il=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},sl=(e,t)=>{let n=e[0].dims,r=e[0].dataType,o=n.length,i=e[1].dims,s=e[1].dataType,a=v.normalizeAxis(t.axis,o),u=n[a],d=i.slice(0),c=v.size(d),l=S("input",r,o),p=S("indicesInput",s,i.length),f=C("output",r,d.length),m=[{type:12,data:c},{type:6,data:u},{type:12,data:a}];return m.push(...E(n,i,d)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:d,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:m}),getShaderSource:w=>`
      ${w.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(l,p,f)}
      ${w.mainStart()}
      ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${f.offsetToIndices("global_idx")};

      var idx = ${p.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${l.type.indices}(outputIndices);
      ${l.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${l.getByIndices("inputIndices")};

      ${f.setByOffset("global_idx","value")};
  }`}},Ts=e=>M({axis:e.axis}),As=(e,t)=>{let n=e.inputs;il(n),e.compute(sl(e.inputs,t))}});var al,ul,Es,Ps,zs=A(()=>{"use strict";R();N();G();al=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},ul=(e,t)=>{let n=e[0].dims.slice(),r=e[1].dims.slice(),[o,i,s]=Nt.getShapeOfGemmResult(n,t.transA,r,t.transB,e.length===3?e[2].dims:void 0),a=[o,i];if(!a)throw new Error("Can't use gemm on the given tensors");let u=v.size(a),d=[{type:12,data:u},{type:12,data:o},{type:12,data:i},{type:12,data:s},{type:1,data:t.alpha},{type:1,data:t.beta}],c=["type","type"];e.length===3&&(d.push(...E(e[2].dims)),c.push("rank")),d.push(...E(a));let l=p=>{let f="";t.transA&&t.transB?f="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":t.transA&&!t.transB?f="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!t.transA&&t.transB?f="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!t.transA&&!t.transB&&(f="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let m=t.alpha===1?"":"value *= uniforms.alpha;",h=S("a",e[0].dataType,e[0].dims),y=S("b",e[1].dataType,e[1].dims),w=h.type.value,g=null,b=[h,y];e.length===3&&(g=S("c",e[2].dataType,e[2].dims.length),b.push(g));let $=C("output",e[0].dataType,a.length);b.push($);let _=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${p.registerUniforms(_).declareVariables(...b)}

  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${w}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${f}
    }

    ${m}
    ${(()=>g!=null?`let cOffset = ${g.broadcastedIndicesToOffset("vec2(m, n)",$)}; value += ${w}(uniforms.beta) * ${g.getByOffset("cOffset")};`:"")()}
    output[global_idx] = value;
  }`};return{name:"Gemm",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:c},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d}),getShaderSource:l}},Es=e=>{let t=e.transA,n=e.transB,r=e.alpha,o=e.beta;return{transA:t,transB:n,alpha:r,beta:o,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},Ps=(e,t)=>{al(e.inputs),e.compute(ul(e.inputs,t))}});var ge,cl,Bs,Os,pl,ft,Ds,Xn=A(()=>{"use strict";R();N();ie();Vt();Ft();G();je();ge=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,cl=(e,t)=>{let n=e[0],r=ge(e,1),o=ge(e,2),i=ge(e,3),s=ge(e,4),a=ge(e,5),u=ge(e,6),d=ge(e,7);if(n.dims.length!==3&&n.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let c=n.dims[0],l=n.dims[1],p=n.dims.length===3?n.dims[2]:t.numHeads*n.dims[4],f=l,m=0,h=0,y=Math.floor(p/t.numHeads);if(u&&d&&v.size(u.dims)&&v.size(d.dims)){if(u.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(u.dims[0]!==c||u.dims[1]!==t.numHeads||u.dims[3]!==y)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(d.dims[0]!==c||d.dims[1]!==t.numHeads||d.dims[3]!==y)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(u.dims[2]!==d.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(d.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');m=u.dims[2],h=u.dims[2]}else if(u&&v.size(u.dims)||d&&v.size(d.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let w;if(r&&v.size(r.dims)>0){if(n.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(r.dims.length<3||r.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(n.dims[0]!==r.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(r.dims.length===3){if(r.dims[2]!==n.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');w=2,f=r.dims[1]}else if(r.dims.length===5){if(r.dims[2]!==t.numHeads||r.dims[3]!==2||r.dims[4]!==y)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(o)throw new Error('Expect "value" be none when "key" has packed kv format.');w=5,f=r.dims[1]}else{if(r.dims[1]!==t.numHeads||r.dims[3]!==y)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');w=0,f=r.dims[2]}}else{if(n.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(n.dims[2]!==t.numHeads||n.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');w=3}if(i&&v.size(i.dims)>0){if(i.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(r&&r.dims.length===5&&r.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let g=m+f,b=0;if(s&&v.size(s.dims)>0){b=8;let I=s.dims;throw I.length===1?I[0]===c?b=1:I[0]===3*c+2&&(b=3):I.length===2&&I[0]===c&&I[1]===g&&(b=5),b===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let $=!1,_=p;if(o&&v.size(o.dims)>0){if(o.dims.length!==3&&o.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(n.dims[0]!==o.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(o.dims.length===3){if(f!==o.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');_=o.dims[2]}else{if(f!==o.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');_=o.dims[1]*o.dims[3],$=!0}}let x=!1;if(s&&v.size(s.dims)>0)throw new Error("Key padding mask is not supported");if(a&&v.size(a.dims)>0){if(a.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(a.dims[0]!==c||a.dims[1]!==t.numHeads||a.dims[2]!==l||a.dims[3]!==g)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:c,sequenceLength:l,pastSequenceLength:m,kvSequenceLength:f,totalSequenceLength:g,maxSequenceLength:h,inputHiddenSize:0,hiddenSize:p,vHiddenSize:_,headSize:y,vHeadSize:Math.floor(_/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:b,scale:t.scale,broadcastResPosBias:x,passPastInKv:$,qkvFormat:w}},Bs=e=>M({...e}),Os=M({perm:[0,2,1,3]}),pl=(e,t,n,r,o,i,s)=>{let a=[r,o,i],u=v.size(a),d=[{type:12,data:u},{type:12,data:s},{type:12,data:i}],c=l=>{let p=C("qkv_with_bias",t.dataType,a),f=S("qkv",t.dataType,a),m=S("bias",n.dataType,a),h=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${l.registerUniforms(h).declareVariables(f,m,p)}
  ${l.mainStart()}
    ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:a,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d}),getShaderSource:c},{inputs:[t,n],outputs:[-1]})[0]},ft=(e,t,n,r,o,i,s,a)=>{let u=i;if(s&&v.size(s.dims)>0){if(r===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return u=pl(e,i,s,t,r,n*o,a),u=u.reshape([t,r,n,o]),e.compute(he(u,Os.perm),{inputs:[u],outputs:[-1]})[0]}else return i.dims.length===3&&(u=i.reshape([t,r,n,o])),e.compute(he(u,Os.perm),{inputs:[u],outputs:[-1]})[0]},Ds=(e,t)=>{let n=cl(e.inputs,t),r=e.inputs[0],o=ge(e.inputs,1),i=ge(e.inputs,2),s=ge(e.inputs,3),a=ge(e.inputs,4),u=ge(e.inputs,5),d=ge(e.inputs,6),c=ge(e.inputs,7);if(r.dims.length===5)throw new Error("Packed QKV is not implemented");if(o?.dims.length===5)throw new Error("Packed KV is not implemented");let l=o&&i&&o.dims.length===4&&i.dims.length===4,p=ft(e,n.batchSize,n.numHeads,n.sequenceLength,n.headSize,r,s,0);if(l)return Je(e,p,o,i,a,void 0,d,c,u,n,t);if(!o||!i)throw new Error("key and value must be provided");let f=ft(e,n.batchSize,n.numHeads,n.kvSequenceLength,n.headSize,o,s,n.hiddenSize),m=ft(e,n.batchSize,n.numHeads,n.kvSequenceLength,n.vHeadSize,i,s,2*n.hiddenSize);Je(e,p,f,m,a,void 0,d,c,u,n,t)}});var Rs,ml,fl,Qn,Us,Yn=A(()=>{"use strict";R();N();G();Rs=e=>Array.from(e.getBigInt64Array(),Number),ml=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(Rs(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},fl=(e,t)=>{let n=[];for(let r=0;r<e.length;++r)n.push(e[r]*t[r]);return n},Qn=(e,t)=>{let n=e[0].dims,r=t??Rs(e[1]),o=fl(n,r),i=v.size(o),s=e[0].dataType,a=S("input",s,n.length),u=C("output",s,o.length),d=c=>`
      const inputShape = ${a.indices(...n)};
      ${c.registerUniform("output_size","u32").declareVariables(a,u)}
      ${c.mainStart()}
      ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${u.offsetToIndices("global_idx")};
      var input_indices: ${a.type.indices};
      for (var i = 0; i < ${n.length}; i++) {
        let input_dim_i = ${a.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${u.indicesGet("output_indices","i")}  % input_dim_i;

        ${a.indicesSet("input_indices","i","input_dim_value")}
      }
      ${u.setByOffset("global_idx",a.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${r}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:[{type:12,data:i},...E(e[0].dims,o)]}),getShaderSource:d}},Us=e=>{ml(e.inputs),e.compute(Qn(e.inputs),{inputs:[0]})}});var hl,Ms,Ns,gl,Vs,Ws,Gs=A(()=>{"use strict";R();N();ie();Ft();G();Xn();Yn();je();hl=(e,t)=>{let n=e[0],r=e[1],o=e[2],i=e[3],s=e[4];if(n.dims.length!==3&&n.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let a=!1,u=n.dims[0],d=n.dims[1],c=n.dims.length===3?a?n.dims[2]/3:n.dims[2]:t.numHeads*n.dims[4],l=d,p=0,f=0,m=Math.floor(c/t.numHeads),h=i&&i.dims.length!==0,y=s&&s.dims.length!==0,w=!0;if(h&&y){if(i.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(s.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');w?(p=i.dims[1],f=i.dims[1]):(p=i.dims[2],f=i.dims[2])}else if(h||y)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let g;if(r){if(n.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(r.dims.length<3||r.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(n.dims[0]!==r.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(r.dims.length===3){if(n.dims[2]%r.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');g=2,l=r.dims[1]}else if(r.dims.length===5){if(r.dims[2]!==t.numHeads||r.dims[3]!==2||r.dims[4]!==m)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(o)throw new Error('Expect "value" be none when "key" has packed kv format.');g=5,l=r.dims[1]}else{if(r.dims[1]!==t.numHeads||r.dims[3]!==m)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');g=0,l=r.dims[2]}}else{if(n.dims.length!==3&&n.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(n.dims.length===5&&(n.dims[2]!==t.numHeads||n.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');g=3}let b=0,$=!1,_=c;if(o){if(o.dims.length!==3&&o.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(n.dims[0]!==o.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(o.dims.length===3){if(l!==o.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');_=o.dims[2]}else{if(l!==o.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');_=o.dims[1]*o.dims[3],$=!0}}let x=p+l,I=!1;return{batchSize:u,sequenceLength:d,pastSequenceLength:p,kvSequenceLength:l,totalSequenceLength:x,maxSequenceLength:f,inputHiddenSize:0,hiddenSize:c,vHiddenSize:_,headSize:m,vHeadSize:Math.floor(_/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:b,scale:t.scale,broadcastResPosBias:I,passPastInKv:$,qkvFormat:g,isPastkvBSNH:w}},Ms=(e,t,n,r)=>{let o=[r.batchSize,r.totalSequenceLength,r.kvNumHeads,r.headSize],i=4,s=v.size(o)/i,a=r.totalSequenceLength,u=C("present_kv",n,o.length,i),d=S("new_kv",e.dataType,e.dims.length,i),c=t?S("past_kv",t.dataType,t.dims.length,i):void 0,l=Math.ceil(r.headSize/i),p={x:a,y:e.dims[0],z:1},f=t?["rank","rank"]:["rank"],m=[{type:12,data:s},{type:12,data:r.pastSequenceLength},{type:12,data:r.kvSequenceLength},{type:12,data:r.totalSequenceLength}],h=[d];c?(m.push(...E(e.dims),...E(t.dims),...E(o)),h.push(c)):m.push(...E(e.dims),...E(o));let y=[{name:"output_size",type:"u32"},{name:"past_seqlen",type:"u32"},{name:"new_seqlen",type:"u32"},{name:"present_seqlen",type:"u32"}],w=`      let past_batch_stride = uniforms.past_seqlen * num_heads * H;
        var past_head_stride = uniforms.past_seqlen * H;
        if (is_bsnh) {
          past_head_stride = H;
        }
        let in_offset = b * past_batch_stride + s * row_stride + n * past_head_stride + h;
        present_kv[out_offset] = past_kv[in_offset];`,g=`      let new_batch_stride = uniforms.new_seqlen * num_heads * H;
        let new_row_stride = num_heads * H;
        let new_head_stride = H;
        let in_offset = b * new_batch_stride + (s - past_seqlen) * new_row_stride + n * new_head_stride + h;
        present_kv[out_offset] = new_kv[in_offset];`,b=t?`if (s < past_seqlen) {
        ${w}
        } else if (s < past_seqlen + uniforms.new_seqlen) {
        ${g}
        }`:`if (s < past_seqlen + uniforms.new_seqlen) {
          ${g}
        }`,$=_=>`

  ${_.registerUniforms(y).declareVariables(...h,u)}
  ${_.mainStart([l,r.kvNumHeads,1])}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    var indices = ${u.offsetToIndices("global_idx")};
    let h = local_id.x;
    let n = local_id.y;
    let s = workgroup_id.x;
    let b = workgroup_id.y;
    let num_heads = ${r.kvNumHeads}u;
    let H = ${l}u;

    let present_seqlen = uniforms.present_seqlen;
    let present_batch_stride = present_seqlen * num_heads * H;
    var row_stride = H;
    let is_bsnh = ${r.isPastkvBSNH};

    if (is_bsnh) {
      row_stride = num_heads * H;
    }
    var present_head_stride = present_seqlen * H;
    if (is_bsnh) {
      present_head_stride = H;
    }

    let past_seqlen = uniforms.past_seqlen;

    let out_offset = b * present_batch_stride + s * row_stride + n * present_head_stride + h;
    ${b}
  }`;return{name:"ConcatPastNew",shaderCache:{hint:`${r.kvNumHeads}${l}${!!t}`,inputDependencies:f},getRunData:()=>({outputs:[{dims:o,dataType:n}],dispatchGroup:p,programUniforms:m}),getShaderSource:$}},Ns=e=>M({...e}),gl=M({perm:[0,2,1,3]}),Vs=(e,t,n,r,o)=>{let i=t,s=r.kvNumHeads,a=r.nReps;return t.dims.length===3&&r.kvSequenceLength!==0&&(i=t.reshape([r.batchSize,r.kvSequenceLength,s,r.headSize])),n?i=e.compute(Ms(i,n,i.dataType,r),{inputs:[i,n],outputs:[r.isPastkvBSNH?o:-1]})[0]:i=e.compute(Ms(i,void 0,i.dataType,r),{inputs:[i],outputs:[r.isPastkvBSNH?o:-1]})[0],a!==1&&(i=e.compute(Qn([i],[1,1,1,a]),{inputs:[i],outputs:[-1]})[0],i=i.reshape([r.batchSize,r.totalSequenceLength,s*a,r.headSize])),e.compute(he(i,gl.perm),{inputs:[i],outputs:[-1]})[0]},Ws=(e,t)=>{let n=hl(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(e.inputs[1]?.dims.length===5)throw new Error("Packed KV is not implemented");let r=ft(e,n.batchSize,n.numHeads,n.sequenceLength,n.headSize,e.inputs[0],void 0,0),o=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,i=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,s=Vs(e,e.inputs[1],o,n,1),a=Vs(e,e.inputs[2],i,n,2);Je(e,r,s,a,void 0,void 0,void 0,void 0,void 0,n,t)}});var yl,bl,wl,Ls,Hs=A(()=>{"use strict";R();N();G();yl=(e,t)=>{let n=e[0].dims,r=n,o=2,i=v.sizeToDimension(n,o),s=v.sizeFromDimension(n,o),a=ee(s),u=s/a,d=[n[0],n[1],u],c=["rank","type","type"],l=[{type:12,data:s},{type:12,data:u}];l.push(...E(d,d));let p=f=>{let m=S("x",e[0].dataType,d.length,a),h=S("scale",e[1].dataType,e[1].dims),y=S("bias",e[2].dataType,e[2].dims),w=C("output",e[0].dataType,d.length,a),g=[m,h,y,w],b=m.type.value,$=a===1?"f32":`vec${a}<f32>`,_=64,x=[{name:"normSize",type:"u32"},{name:"normPackedSize",type:"u32"}];return`
  var<workgroup> meanShared : f32;
  var<workgroup> squaredNormShared : f32;
  var<workgroup> workgroupShared : array<${$}, ${_}>;
  const workgroupSize = ${_}u;
  ${f.registerUniforms(x).declareVariables(...g)}
  ${f.mainStart(_)}
    let norm = global_idx / workgroupSize;
    let batch = norm / uniforms.x_shape[1];
    let channel = norm % uniforms.x_shape[1];
    let localIndex = local_id.x;

    // initialize workgroup memory
    var initial = ${$}(0);
    for (var h = localIndex; h < uniforms.normPackedSize; h += workgroupSize) {
      initial = initial + ${$}(${m.get("batch","channel","h")});
    }
    workgroupShared[localIndex] = initial;
    workgroupBarrier();

    // Calculate the mean of current channel data.
    for (var currSize = workgroupSize >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (localIndex < currSize) {
        workgroupShared[localIndex] = workgroupShared[localIndex] + workgroupShared[localIndex + currSize];
      }
      workgroupBarrier();
    }
    if (localIndex == 0) {
      meanShared = ${Ae("workgroupShared[0]",a)} / f32(uniforms.normSize);
    }
    workgroupBarrier();

    // reinitialize workgroup memory.
    initial = ${$}(0);
    for (var h = localIndex; h < uniforms.normPackedSize; h += workgroupSize) {
      let deviation =  ${$}(${m.get("batch","channel","h")}) - ${$}(meanShared);
      initial = initial + deviation * deviation;
    }
    workgroupShared[localIndex] = initial;
    workgroupBarrier();

    // Calculate the sum of square of deviation of current channel data.
    for (var currSize = workgroupSize >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (localIndex < currSize) {
        workgroupShared[localIndex] = workgroupShared[localIndex] + workgroupShared[localIndex + currSize];
      }
      workgroupBarrier();
    }
    if (localIndex == 0) {
      squaredNormShared = ${Ae("workgroupShared[0]",a)};
    }
    workgroupBarrier();

    let invStdDev = inverseSqrt(squaredNormShared / f32(uniforms.normSize) + f32(${t.epsilon}));
    let channelScale = invStdDev * f32(${h.getByOffset("channel")});
    let channelShift = f32(${y.getByOffset("channel")}) - meanShared * channelScale;
    for (var h = localIndex; h < uniforms.normPackedSize; h += workgroupSize) {
      let value = ${m.get("batch","channel","h")} * ${b}(${$}(channelScale)) + ${b}(${$}(channelShift));
      ${w.set("batch","channel","h","value")};
    }
  }`};return{name:"InstanceNormalization",shaderCache:{hint:`${t.epsilon};${a}`,inputDependencies:c},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:i},programUniforms:l}),getShaderSource:p}},bl=(e,t,n,r,o,i,s,a)=>{let u=ee(s),d=64,c=u===1?"vec2f":`mat2x${u}f`,l=u===1?"f32":`vec${u}f`,p=(x,I)=>`${c}(${x}, ${I})`,f=o*s/u,m=Math.ceil(i/d),h=["type"],y=[{type:12,data:m},{type:12,data:i},{type:12,data:Math.floor(s/u)},{type:12,data:Math.floor(i*s/u)}],w=x=>{let I=S("input",t.dataType,t.dims,u);return`
  ${x.declareVariables(I)}
  @group(0) @binding(1) var<storage, read_write> output : array<${c}>;
  struct Uniforms {wg_size:u32, H:u32, C:u32, image_size:u32};
  @group(0) @binding(2) var<uniform> uniforms: Uniforms;

  ${x.mainStart(d)}
    let currentImageNumber = global_idx / ${d} / uniforms.C;
    let currentChannelNumber = (global_idx / ${d}) % uniforms.C;
    let wgOffset = local_id.x * uniforms.wg_size;
    if (wgOffset >= uniforms.H) {
        return;
    }
    let wgMax = min(wgOffset + uniforms.wg_size, uniforms.H);

    let offset = currentImageNumber * uniforms.image_size + currentChannelNumber;
    var sum = ${Me("f32",u)};
    var squaredSum = ${Me("f32",u)};
    for (var i: u32 = wgOffset; i < wgMax; i++) {
        let value = ${l}(input[offset + i * uniforms.C]);
        sum += value;
        squaredSum += value * value;
    }
    output[global_idx] = ${p("sum","squaredSum")};
  }`},g=e.compute({name:"InstanceNormComputeMean",shaderCache:{hint:`${u}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:[o,s,d,2],dataType:1}],dispatchGroup:{x:o*s/u},programUniforms:y}),getShaderSource:w},{inputs:[t],outputs:[-1]})[0],b=[{type:12,data:f},{type:12,data:i},{type:12,data:Math.floor(s/u)},{type:12,data:Math.floor(d*s/u)}],$=["type","type","type"],_=x=>{let I=S("scale",n.dataType,n.dims,u),T=S("bias",r.dataType,r.dims,u);return`
  @group(0) @binding(0) var<storage, read> input : array<${c}>;
  @group(0) @binding(1) var<storage, read> scale : array<${I.type.storage}>;
  @group(0) @binding(2) var<storage, read> bias : array<${T.type.storage}>;
  @group(0) @binding(3) var<storage, read_write> output : array<${c}>;
  struct Uniforms {units_of_work : u32, H: u32, C : u32, image_size : u32};
  @group(0) @binding(4) var<uniform> uniforms: Uniforms;

  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.units_of_work")}
    let currentImageNumber = global_idx / uniforms.C;
    let currentChannelNumber = global_idx % uniforms.C;

    let offset = currentImageNumber * uniforms.image_size;
    var sum = ${Me("f32",u)};
    var squaredSum = ${Me("f32",u)};
    for (var i: u32 = 0; i < min(${d}, uniforms.H); i++) {
        let value = input[offset + i + currentChannelNumber * ${d}];
        sum += value[0];
        squaredSum += value[1];
    }
    sum = sum / f32(uniforms.H);
    squaredSum = squaredSum / f32(uniforms.H);
    let invStdDev = inverseSqrt(squaredSum - sum * sum + f32(${a}));
    let channelScale = invStdDev * ${l}(scale[currentChannelNumber]);
    let channelShift = ${l}(bias[currentChannelNumber]) - sum * channelScale;

    output[global_idx] = ${p("channelScale","channelShift")};
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${u};${a}`,inputDependencies:$},getRunData:()=>({outputs:[{dims:[o,s,2],dataType:1}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:b}),getShaderSource:_},{inputs:[g,n,r],outputs:[-1]})[0]},wl=(e,t,n)=>{let r=t[0].dims,o=r,i=r[0],s=r[r.length-1],a=v.sizeFromDimension(r,1)/s,u=ee(s),d=v.size(o)/u,c=[{type:12,data:a},{type:12,data:Math.floor(s/u)}],l=["type","type"],p=bl(e,t[0],t[1],t[2],i,a,s,n.epsilon),f=m=>{let h=Q(t[0].dataType),y=u===1?"vec2f":`mat2x${u}f`,w=u===1?h:`vec${u}<${h}>`,g=S("input",t[0].dataType,t[0].dims,u),b=C("output",t[0].dataType,o,u);return`
  @group(0) @binding(0) var<storage, read> input : array<${g.type.storage}>;
  @group(0) @binding(1) var<storage, read> scaleInput : array<${y}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${b.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${m.mainStart()}
    let currentImageNumber = global_idx / (uniforms.C * uniforms.H);
    let currentChannelNumber = global_idx % uniforms.C;

    let scaleOffset = currentImageNumber * uniforms.C + currentChannelNumber;
    let scale = scaleInput[scaleOffset];
    output[global_idx] = fma(input[global_idx], ${w}(scale[0]), ${w}(scale[1]));
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${u}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:o,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:c}),getShaderSource:f},{inputs:[t[0],p]})},Ls=(e,t)=>{t.format==="NHWC"?wl(e,e.inputs,t):e.compute(yl(e.inputs,t))}});var $l,_l,qs,Fs=A(()=>{"use strict";R();N();G();$l=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},_l=(e,t,n)=>{let r=t.simplified,o=e[0].dims,i=e[1],s=!r&&e[2],a=o,u=v.normalizeAxis(t.axis,o.length),d=v.sizeToDimension(o,u),c=v.sizeFromDimension(o,u),l=v.size(i.dims),p=s?v.size(s.dims):0;if(l!==c||s&&p!==c)throw new Error(`Size of X.shape()[axis:] == ${c}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${l} and bias size of ${p}`);let f=[];for(let _=0;_<o.length;++_)_<u?f.push(o[_]):f.push(1);let m=ee(c),h=["type","type"],y=[{type:12,data:d},{type:1,data:c},{type:12,data:Math.floor(c/m)},{type:1,data:t.epsilon}];s&&h.push("type");let w=n>1,g=n>2,b=_=>{let x=Q(e[0].dataType),I=[S("x",e[0].dataType,e[0].dims,m),S("scale",i.dataType,i.dims,m)];s&&I.push(S("bias",s.dataType,s.dims,m)),I.push(C("output",e[0].dataType,a,m)),w&&I.push(C("mean_data_output",1,f)),g&&I.push(C("inv_std_output",1,f));let T=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${_.registerUniforms(T).declareVariables(...I)}
  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${Me("f32",m)};
    var mean_square_vector = ${Me("f32",m)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${Ke(x,m,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${Ae("mean_vector",m)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${Ae("mean_square_vector",m)} / uniforms.norm_size ${r?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${Ke(x,m,"x[j + offset]")};
      let f32scale = ${Ke(x,m,"scale[j]")};
      output[j + offset] = ${I[0].type.value}((f32input ${r?"":"- mean"}) * inv_std_dev * f32scale
        ${s?`+ ${Ke(x,m,"bias[j]")}`:""}
      );
    }

    ${w?"mean_data_output[global_idx] = mean":""};
    ${g?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},$=[{dims:a,dataType:e[0].dataType}];return w&&$.push({dims:f,dataType:1}),g&&$.push({dims:f,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${m};${n};${r}`,inputDependencies:h},getRunData:()=>({outputs:$,dispatchGroup:{x:Math.ceil(d/64)},programUniforms:y}),getShaderSource:b}},qs=(e,t)=>{$l(e.inputs),e.compute(_l(e.inputs,t,e.outputCount))}});var vl,xl,Ks,js,Zs=A(()=>{"use strict";R();N();ie();G();vl=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let n=e[0],r=n.dims.length;if(n.dims[r-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let o=Math.floor((t.k+t.blockSize-1)/t.blockSize),i=t.blockSize/8*t.bits,s=e[1];if(!v.areEqual(s.dims,[t.n,o,i]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let u=e[2].dims;if(v.size(u)!==t.n*o)throw new Error("scales input size error.");if(e.length===4){let c=e[3].dims,l=t.bits>4?t.n*o:t.n*Math.floor((o+1)/2);if(v.size(c)!==l)throw new Error("zeroPoints input size error.")}},xl=(e,t)=>{let n=e[0].dims,r=n.length,o=n[r-2],i=t.k,s=t.n,a=n.slice(0,r-2),u=v.size(a),c=e[1].dims[2]/4,l=e[0].dataType,p=ee(t.k),f=ee(c),m=ee(s),h=a.concat([o,s]),y=o>1&&s/m%2===0?2:1,w=v.size(h)/m/y,g=64,b=[],$=[u,o,i/p],_=v.convertShape(e[1].dims).slice();_.splice(-1,1,c/f),b.push(...E($)),b.push(...E(_)),b.push(...E(e[2].dims)),e.length===4&&b.push(...E(v.convertShape(e[3].dims)));let x=[u,o,s/m];b.push(...E(x));let I=T=>{let P=$.length,z=S("a",e[0].dataType,P,p),D=S("b",12,_.length,f),j=S("scales",e[2].dataType,e[2].dims.length),L=[z,D,j],q=e.length===4?S("zero_points",12,e[3].dims.length):void 0;q&&L.push(q);let ae=x.length,U=C("output",e[0].dataType,ae,m),te=Q(e[0].dataType),re=(()=>{switch(p){case 1:return`array<${te}, 8>`;case 2:return`mat4x2<${te}>`;case 4:return`mat2x4<${te}>`;default:throw new Error(`${p}-component is not supported.`)}})(),V=()=>{let H=`
          // reuse a data
            var input_offset = ${z.indicesToOffset(`${z.type.indices}(batch, row, word_offset)`)};
            var a_data: ${re};
            for (var j: u32 = 0; j < ${8/p}; j++) {
              a_data[j] = ${z.getByOffset("input_offset")};
              input_offset++;
            }
          `;for(let K=0;K<m*y;K++)H+=`
            b_value = ${f===1?`b${K}_data`:`b${K}_data[i]`};
            b_value_lower = unpack4xU8(b_value & b_mask);
            b_value_upper = unpack4xU8((b_value >> 4) & b_mask);
            b_quantized_values = ${re}(${Array.from({length:4},(k,B)=>`${te}(b_value_lower[${B}]), ${te}(b_value_upper[${B}])`).join(", ")});
            b_dequantized_values = ${(()=>p===1?`${re}(${Array.from({length:8},(k,B)=>`(b_quantized_values[${B}] - ${q?`zero_point${K}`:"zero_point"}) * scale${K}`).join(", ")});`:`(b_quantized_values - ${re}(${Array(8).fill(`${q?`zero_point${K}`:"zero_point"}`).join(",")})) * scale${K};`)()};
            workgroup_shared[local_id.x * ${y} + ${Math.floor(K/m)}]${m>1?`[${K%m}]`:""} += ${Array.from({length:8/p},(k,B)=>`${p===1?`a_data[${B}] * b_dequantized_values[${B}]`:`dot(a_data[${B}], b_dequantized_values[${B}])`}`).join(" + ")};
          `;return H},ne=()=>{let H=`
            var col_index = col * ${m};
            ${q?`
            let zero_point_bytes_per_col = (nBlocksPerCol + 1) / 2;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${te}(8);`}
            `;for(let K=0;K<m*y;K++)H+=`
            let scale${K} = ${j.getByOffset("col_index * nBlocksPerCol + block")};
            ${q?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block >> 0x1u);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            zero_point_word = ${q.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${K} = ${te}((zero_point_word) & 0xFu);`:""}
            col_index += 1;`;return H},F=()=>{let H=`col_index = col * ${m};`;for(let K=0;K<m*y;K++)H+=`
            let b${K}_data = ${D.getByIndices(`${D.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return H+=`
            var b_value: u32;
            let b_mask: u32 = 0x0F0F0F0Fu;
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${re};
            var b_dequantized_values: ${re};`,H};return`
        var<workgroup> workgroup_shared: array<${U.type.value}, ${y*g}>;
        ${T.declareVariables(...L,U)}
        ${T.mainStart([g,1,1])}
          let output_indices = ${U.offsetToIndices(`(global_idx / ${g}) * ${y}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${g}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/p};
            ${ne()}
            for (var word: u32 = 0; word < ${c}; word += ${f}) {
              ${F()}
              for (var i: u32 = 0; i < ${f}; i++) {
                ${V()}
                word_offset += ${8/p};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${y}) {
            var output_value: ${U.type.value} = ${U.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${g}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${y};
            }
            ${U.setByIndices(`${U.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${p};${f};${m};${y};${g}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:h,dataType:l}],dispatchGroup:{x:w},programUniforms:b}),getShaderSource:I}},Ks=(e,t)=>{vl(e.inputs,t),e.compute(xl(e.inputs,t))},js=e=>M(e)});var Sl,Il,Cl,Tl,Al,kl,El,Pl,Xs,Qs=A(()=>{"use strict";R();N();G();Sl=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},Il=(e,t,n)=>{let r="";for(let o=t-1;o>=0;--o)r+=`
            k = i32(${e.indicesGet("indices",o)}) - ${O("uniforms.pads",o,n)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${O("uniforms.x_shape",o,t)})) {
              break;
            }
            offset += k * i32(${O("uniforms.x_strides",o,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${r}
            value = x[offset];
          }
      `},Cl=(e,t,n)=>{let r="";for(let o=t-1;o>=0;--o)r+=`
                k = i32(${e.indicesGet("indices",o)}) - ${O("uniforms.pads",o,n)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${O("uniforms.x_shape",o,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${O("uniforms.x_shape",o,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${O("uniforms.x_strides",o,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},Tl=(e,t,n)=>{let r="";for(let o=t-1;o>=0;--o)r+=`
                k = i32(${e.indicesGet("indices",o)}) - ${O("uniforms.pads",o,n)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${O("uniforms.x_shape",o,t)})) {
                  k = i32(${O("uniforms.x_shape",o,t)}) - 1;
                }
                offset += k * i32(${O("uniforms.x_strides",o,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},Al=(e,t,n)=>{let r="";for(let o=t-1;o>=0;--o)r+=`
                k = i32(${e.indicesGet("indices",o)}) - ${O("uniforms.pads",o,n)};
                if (k < 0)  {
                  k += i32(${O("uniforms.x_shape",o,t)}]);
                }
                if (k >= i32(${O("uniforms.x_shape",o,t)})) {
                  k -= i32(${O("uniforms.x_shape",o,t)});
                }
                offset += k * i32(${O("uniforms.x_strides",o,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},kl=(e,t,n)=>{switch(n.mode){case 0:return Il(e,t,n.pads.length);case 1:return Cl(e,t,n.pads.length);case 2:return Tl(e,t,n.pads.length);case 3:return Al(e,t,n.pads.length);default:throw new Error("Invalid mode")}},El=(e,t)=>{let n=v.padShape(e[0].dims.slice(),t.pads),r=e[0].dims,o=v.size(n),i=[{type:12,data:o},{type:6,data:t.pads}],s=e.length>=3&&e[2].data;t.mode===0&&i.push({type:s?e[2].dataType:1,data:t.value}),i.push(...E(e[0].dims,n));let a=["rank"],u=d=>{let c=C("output",e[0].dataType,n.length),l=S("x",e[0].dataType,r.length),p=l.type.value,f=kl(c,r.length,t),m=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&m.push({name:"constant_value",type:s?p:"f32"}),`
            ${d.registerUniforms(m).declareVariables(l,c)}
            ${d.mainStart()}
            ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${c.offsetToIndices("global_idx")};

            var value = ${p}(0);
            ${f}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${s}`,inputDependencies:a},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(v.size(n)/64)},programUniforms:i}),getShaderSource:u}},Pl=(e,t)=>{if(e.length>1){let n=e[1].getBigInt64Array(),r=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,o=e[0].dims.length,i=new Int32Array(2*o).fill(0);if(e.length>=4){let a=e[3].getBigInt64Array();for(let u=0;u<a.length;u++)i[Number(a[u])]=Number(n[u]),i[Number(a[u])+o]=Number(n[u+a.length])}else n.forEach((a,u)=>i[Number(u)]=Number(a));let s=[];return i.forEach(a=>s.push(a)),{mode:t.mode,value:r,pads:s}}else return t},Xs=(e,t)=>{Sl(e.inputs);let n=Pl(e.inputs,t);e.compute(El(e.inputs,n),{inputs:[0]})}});var nn,Ys,Js,ea,ta,zl,Ol,na,ra,oa,ia,sa,aa,ua,da,la,ca,pa,ma,fa=A(()=>{"use strict";Se();R();N();G();nn=e=>{if(X.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Ys=(e,t,n)=>{let r=t.format==="NHWC",o=e.dims.slice();r&&o.splice(1,0,o.pop());let i=Object.hasOwnProperty.call(t,"dilations"),s=t.kernelShape.slice(),a=t.strides.slice(),u=i?t.dilations.slice():[],d=t.pads.slice();qe.adjustPoolAttributes(n,o,s,a,u,d);let c=qe.computePoolOutputShape(n,o,a,u,s,d,t.autoPad),l=Object.assign({},t);i?Object.assign(l,{kernelShape:s,strides:a,pads:d,dilations:u,cacheKey:t.cacheKey}):Object.assign(l,{kernelShape:s,strides:a,pads:d,cacheKey:t.cacheKey});let p=c.slice();return p.push(p.splice(1,1)[0]),[l,r?p:c]},Js=(e,t)=>{let n=t.format==="NHWC",r=v.size(e),o=v.size(t.kernelShape),i=[{type:12,data:r},{type:12,data:o}],s=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let a=t.kernelShape[t.kernelShape.length-1],u=t.strides[t.strides.length-1],d=t.pads[t.pads.length/2-1],c=t.pads[t.pads.length-1],l=!!(d+c);i.push({type:12,data:a},{type:12,data:u},{type:12,data:d},{type:12,data:c}),s.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let p=!1;if(t.kernelShape.length===2){let f=t.kernelShape[t.kernelShape.length-2],m=t.strides[t.strides.length-2],h=t.pads[t.pads.length/2-2],y=t.pads[t.pads.length-2];p=!!(h+y),i.push({type:12,data:f},{type:12,data:m},{type:12,data:h},{type:12,data:y}),s.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[i,s,!0,l,p]}else{if(n)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let a=v.computeStrides(t.kernelShape);i.push({type:12,data:a},{type:12,data:t.pads},{type:12,data:t.strides}),s.push({name:"kernelStrides",type:"u32",length:a.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let u=t.pads.reduce((d,c)=>d+c);return[i,s,!!u,!1,!1]}},ea=(e,t,n,r,o,i,s,a,u,d,c,l)=>{let p=o.format==="NHWC",f=t.type.value,m=C("output",t.type.tensor,r);if(o.kernelShape.length<=2){let h="",y="",w="",g=n-(p?2:1);if(c?h=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${g}] = indices[${g}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${g}] < 0 || xIndices[${g}]
                      >= uniforms.x_shape[${g}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${i}
                }`:h=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${g}] = indices[${g}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${i}
                }`,o.kernelShape.length===2){let $=n-(p?3:2);l?y=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${$}] = indices[${$}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${$}] < 0 || xIndices[${$}] >= uniforms.x_shape[${$}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:y=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${$}] = indices[${$}] * uniforms.sh - uniforms.phStart + j;
                `,w=`
              }
            `}return`
            ${e.registerUniforms(u).declareVariables(t,m)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${m.offsetToIndices("global_idx")};
              var xIndices = ${m.offsetToIndices("global_idx")};

              var value = ${f}(${a});
              var pad = 0;
              ${y}
              ${h}
              ${w}
              ${s}

              output[global_idx] = value;
            }`}else{if(p)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let h=o.kernelShape.length,y=o.pads.length,w="";return d?w=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset("xIndices")}];
                ${i}
              }`:w=`
              }
              let x_val = x[${t.indicesToOffset("xIndices")}];
              ${i}
            `,`
            ${e.registerUniforms(u).declareVariables(t,m)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${m.offsetToIndices("global_idx")};
              var xIndices = ${m.offsetToIndices("global_idx")};

              var offsets: array<u32, ${h}>;

              var value = ${f}(${a});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${h-1}u; j++) {
                  offsets[j] = offset / ${O("uniforms.kernelStrides","j",h)};
                  offset -= offsets[j] * ${O("uniforms.kernelStrides","j",h)};
                }
                offsets[${h-1}] = offset;

                isPad = false;
                for (var j = ${n-h}u; j < ${n}u; j++) {
                  xIndices[j] = indices[j] * ${O("uniforms.strides",`j - ${n-h}u`,h)}
                    + offsets[j - ${n-h}u] - ${O("uniforms.pads","j - 2u",y)};
                  ${w}
              }
              ${s}

              output[global_idx] = value;
            }`}},ta=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,zl=e=>`${ta(e)};${e.countIncludePad}`,Ol=e=>`${ta(e)};${e.storageOrder};${e.dilations}`,na=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),ra=(e,t,n,r)=>{let[o,i]=Ys(t,r,n),s=S("x",t.dataType,t.dims.length),a=s.type.value,u="value += x_val;",d="";o.countIncludePad?d+=`value /= ${a}(uniforms.kernelSize);`:d+=`value /= ${a}(i32(uniforms.kernelSize) - pad);`;let[c,l,p,f,m]=Js(i,o);c.push(...E(t.dims,i));let h=["rank"];return{name:e,shaderCache:{hint:`${r.cacheKey};${p};${f};${m}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:i,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(v.size(i)/64)},programUniforms:c}),getShaderSource:y=>ea(y,s,t.dims.length,i.length,o,u,d,0,l,p,f,m)}},oa=e=>{let t=e.count_include_pad!==0,n=na(e);if(n.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let r={countIncludePad:t,...n,cacheKey:""};return{...r,cacheKey:zl(r)}},ia=(e,t)=>{nn(e.inputs),e.compute(ra("AveragePool",e.inputs[0],!1,t))},sa={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},aa=e=>{let t=e.format;return{format:t,...sa,cacheKey:t}},ua=(e,t)=>{nn(e.inputs),e.compute(ra("GlobalAveragePool",e.inputs[0],!0,t))},da=(e,t,n,r)=>{let[o,i]=Ys(t,r,n),s=`
      value = max(x_val, value);
    `,a="",u=S("x",t.dataType,t.dims.length),d=["rank"],[c,l,p,f,m]=Js(i,o);return c.push(...E(t.dims,i)),{name:e,shaderCache:{hint:`${r.cacheKey};${p};${f};${m}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:i,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(v.size(i)/64)},programUniforms:c}),getShaderSource:h=>ea(h,u,t.dims.length,i.length,o,s,a,t.dataType===10?-65504:-1e5,l,p,f,m)}},la=(e,t)=>{nn(e.inputs),e.compute(da("MaxPool",e.inputs[0],!1,t))},ca=e=>{let t=e.storage_order,n=e.dilations,r=na(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(r.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let o={storageOrder:t,dilations:n,...r,cacheKey:""};return{...o,cacheKey:Ol(o)}},pa=e=>{let t=e.format;return{format:t,...sa,cacheKey:t}},ma=(e,t)=>{nn(e.inputs),e.compute(da("GlobalMaxPool",e.inputs[0],!0,t))}});var Dl,Rl,ha,ga,ya=A(()=>{"use strict";R();N();ie();G();Dl=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[0].dataType===6&&e.length>2)throw new Error("In the case of dequantizing int32 there is no zero point.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((n,r)=>n===e[2].dims[r]).reduce((n,r)=>n&&r,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((o,i)=>i===t.axis||o===e[0].dims[i]).reduce((o,i)=>o&&i,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let n=e[0].dims[t.axis],r=e[1].dims[t.axis];if(t.blockSize<Math.ceil(n/r)||t.blockSize>Math.ceil(n/(r-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},Rl=(e,t)=>{let n=v.normalizeAxis(t.axis,e[0].dims.length),r=e[0].dataType,o=r===3,i=e[0].dims,s=e[1].dataType,a=v.size(i),u=r===3||r===2,d=u?[Math.ceil(v.size(e[0].dims)/4)]:e[0].dims,c=e[1].dims,l=e.length>2?e[2]:void 0,p=l?u?[Math.ceil(v.size(l.dims)/4)]:l.dims:void 0,f=c.length===0||c.length===1&&c[0]===1,m=f===!1&&c.length===1,h=ee(a),y=f&&(!u||h===4),w=y?h:1,g=y&&!u?h:1,b=S("input",u?12:r,d.length,g),$=S("scale",s,c.length),_=l?S("zero_point",u?12:r,p.length):void 0,x=C("output",s,i.length,w),I=[b,$];_&&I.push(_);let T=[d,c];l&&T.push(p);let P=[{type:12,data:a/w},{type:12,data:n},{type:12,data:t.blockSize},...E(...T,i)],z=D=>{let j=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${D.registerUniforms(j).declareVariables(...I,x)}
      ${D.mainStart()}
          ${D.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${x.offsetToIndices("global_idx")};

          // Set input x
          ${(()=>u?`
            let input = ${b.getByOffset("global_idx / 4")};
            let x_vec = ${o?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${w===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${b.getByOffset("global_idx")};`)()};

          // Set scale input
          ${(()=>f?`let scale_value= ${$.getByOffset("0")}`:m?`
            let scale_index = ${x.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${$.getByOffset("scale_index")};`:`
            var scale_indices: ${$.type.indices} = output_indices;
            let index = ${$.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${$.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${$.getByIndices("scale_indices")};`)()};

          // Set zero-point input
          ${(()=>_?f?u?`
                let zero_point_input = ${_.getByOffset("0")};
                let zero_point_vec =  ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${_.getByOffset("0")}`:m?u?`
                let zero_point_index = ${x.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${_.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${x.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${_.getByOffset("zero_point_index")};`:u?`
                let zero_point_offset = ${$.indicesToOffset("scale_indices")};
                let zero_point_input = ${_.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${o?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${_.getByIndices("scale_indices")};`:`let zero_point_value = ${u?o?"i32":"u32":b.type.value}(0);`)()};
      // Compute and write output
      ${x.setByOffset("global_idx",`${x.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:_?["rank","rank","rank"]:["rank","rank"]},getShaderSource:z,getRunData:()=>({outputs:[{dims:i,dataType:s}],dispatchGroup:{x:Math.ceil(a/w/64),y:1,z:1},programUniforms:P})}},ha=(e,t)=>{Dl(e.inputs,t),e.compute(Rl(e.inputs,t))},ga=e=>M({axis:e.axis,blockSize:e.blockSize})});var Ul,Ml,ba,wa=A(()=>{"use strict";Se();R();G();Ul=(e,t,n)=>{let r=e===t,o=e<t&&n<0,i=e>t&&n>0;if(r||o||i)throw new Error("Range these inputs' contents are invalid.")},Ml=(e,t,n,r)=>{let o=Math.abs(Math.ceil((t-e)/n)),i=[o],s=o,a=[{type:12,data:s},{type:r,data:e},{type:r,data:n},...E(i)],u=d=>{let c=C("output",r,i.length),l=c.type.value,p=[{name:"outputSize",type:"u32"},{name:"start",type:l},{name:"delta",type:l}];return`
        ${d.registerUniforms(p).declareVariables(c)}
        ${d.mainStart()}
        ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${l}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${r}`},getShaderSource:u,getRunData:()=>({outputs:[{dims:i,dataType:r}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:a})}},ba=e=>{let t=0,n=0,r=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],n=e.inputs[1].getInt32Array()[0],r=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],n=e.inputs[1].getFloat32Array()[0],r=e.inputs[2].getFloat32Array()[0]),X.webgpu.validateInputContent&&Ul(t,n,r),e.compute(Ml(t,n,r,e.inputs[0].dataType),{inputs:[]})}});var Vl,Nl,Wl,Gl,Ll,Hl,ql,Fl,Kl,jl,Zl,$a,Xl,Ql,Yl,Jl,ec,_a,va,xa=A(()=>{"use strict";R();N();ie();G();Vl=(e,t)=>{if(e.every(n=>n>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},Nl=(e,t,n)=>{t.every(o=>o>=0&&o<n||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let r=new Array(n).fill(1);return t.forEach((o,i)=>r[o]=e[i]),r},Wl=(e,t,n,r,o,i)=>{let[s,a,u]=n>10?[1,2,3]:[-1,e.length>1?1:-1,-1],d=e[0].dims.length;if(s>0&&e.length>s&&e[s].dims.length>0)e[s].getFloat32Array().forEach(c=>i.push(c));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(a>0&&e.length>a&&e[a].dims.length>0){if(e[a].getFloat32Array().forEach(c=>r.push(c)),r.length!==0&&r.length!==d&&n>=18&&r.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");Vl(r,t),t.axes.length>0&&Nl(r,t.axes,d).forEach((c,l)=>r[l]=c)}if(u>0&&e.length>u&&(e[u].getBigInt64Array().forEach(c=>o.push(Number(c))),o.length!==d||n>=18&&o.length===t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(r.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(o.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof r<"u"&&typeof o<"u"&&r.length>0&&o.length>d)throw new Error("Resize requires only of scales or sizes to be specified")},Gl=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case"asymmetric":return`return ${t}(xResized) / ${t}(xScale);`;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    // The whole part and the fractional part are calculated separately due to inaccuracy of floating
                    // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
                    // offset-by-one error later in floor().
                    let whole = ${t}(xResized * (lengthOriginal - 1) / (lengthResized - 1));
                    let fract =
                        ${t}(xResized * (lengthOriginal - 1) % (lengthResized - 1)) / ${t}(lengthResized - 1);
                    return whole + fract;
                  }`;case"tf_crop_and_resize":return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case"half_pixel_symmetric":return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case"half_pixel":return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${e} is not supported`)}})()+"}",Ll=(e,t,n)=>`fn getNearestPixelFromOriginal(xOriginal: ${n}, isDownSample: bool) -> ${n} {`+(()=>{switch(e){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";case"simple":default:if(t<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${e} is not supported`)}})()+"}",Hl=(e,t,n)=>{let r=new Array(n).fill(0).concat(new Array(n).fill(1)),o=e.length===0?r:e.slice();return t.length>0?(t.forEach((i,s)=>{r[i]=o[s],r[s+n]=o[t.length+s]}),r):o},ql=(e,t,n,r)=>{let o=[];if(n.length>0)if(r.length>0){if(e.forEach(i=>o.push(i)),Math.max(...r)>e.length)throw new Error("axes is out of bound");r.forEach((i,s)=>o[i]=n[s])}else n.forEach(i=>o.push(i));else{if(t.length===0)throw new Error("Resize requires either scales or sizes.");o=e.map((i,s)=>Math.round(i*t[s]))}return o},Fl=(e,t,n)=>{let r=(()=>{switch(n.keepAspectRatioPolicy){case"not_larger":return n.axes.length>0?Math.min(...n.axes.map(i=>t[i]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case"not_smaller":return n.axes.length>0?Math.max(...n.axes.map(i=>t[i]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${n.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let o=e.slice();return n.axes.length>0?(n.axes.forEach(i=>t[i]=r),n.axes.forEach(i=>o[i]=Math.round(e[i]*t[i]))):(t.fill(r,0,t.length),o.forEach((i,s)=>o[s]=Math.round(i*t[s]))),o},Kl=(e,t,n,r,o)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${n.length}> {
      var original_indices: array<${e.type.value}, ${n.length}>;
      for (var i:u32 = 0; i < ${n.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var scale = ${O("uniforms.scales","i",r)};
        var roi_low = ${O("uniforms.roi","i",o)};
        var roi_hi = ${O("uniforms.roi",`i + ${t.length}`,o)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${O("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${O("uniforms.output_shape","i",n.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,jl=(e,t,n,r,o,i,s)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${O("uniforms.scales","i",o)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${O("uniforms.roi","i",i)};
          var roi_hi = ${O("uniforms.roi",`i + ${n.length}`,i)};
          var input_shape_i = ${O("uniforms.input_shape","i",n.length)};
          var output_shape_i = ${O("uniforms.output_shape","i",r.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${s} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet("input_indices","i"," input_index")}
      }
      return input_indices;
    }`,Zl=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${O("uniforms.input_shape","i",t.length)}) {
          return false;
        }
      }
      return true;
    }`,$a=(e,t,n,r)=>e.rank>r?`
    ${e.indicesSet("input_indices",t,"channel")};
    ${e.indicesSet("input_indices",n,"batch")};
`:"",Xl=(e,t,n,r,o)=>{let[s,a,u,d]=n.length===2?[-1,0,1,-1]:[0,2,3,1],c=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${c} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",a,`max(0, min(row, ${n[a]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(col, ${n[u]} - 1))`)};
      ${$a(e,d,s,2)}
      return ${e.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${c} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${c} = originalIndices[${a}];
      var col:${c} = originalIndices[${u}];
      ${r?`if (row < 0 || row > (${n[a]} - 1) || col < 0 || col > (${n[u]} - 1)) {
        return ${o};
      }`:""};
      row = max(0, min(row, ${n[a]} - 1));
      col = max(0, min(col, ${n[u]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${n.length>2?`u32(originalIndices[${d}])`:"0"};
      var batch: u32 =  ${n.length>2?`u32(originalIndices[${s}])`:"0"};
      var x11: ${c} = getInputValue(batch, channel, row1, col1);
      var x12: ${c} = getInputValue(batch, channel, row1, col2);
      var x21: ${c} = getInputValue(batch, channel, row2, col1);
      var x22: ${c} = getInputValue(batch, channel, row2, col2);
      var dx1: ${c} = abs(row - ${c}(row1));
      var dx2: ${c} = abs(${c}(row2) - row);
      var dy1: ${c} = abs(col - ${c}(col1));
      var dy2: ${c} = abs(${c}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},Ql=(e,t,n,r,o,i,s,a,u,d)=>{let c=n.length===2,l=!0,[p,f]=c?[0,1]:l?[2,3]:[1,2],m=e.type.value,h=y=>{let w=y===p?"row":"col";return`
      fn ${w}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${m} {
        var output_index = ${t.indicesGet("output_indices",y)};
        var originalIdx: ${m} = getOriginalCoordinateFromResizedCoordinate(output_index, ${o[y]},
        ${r[y]}, ${n[y]}, ${i[y]}, ${i[y]} + ${n.length});
        var fractOriginalIdx: ${m} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${a} && (originalIdx < 0 || originalIdx > (${n[y]} - 1))) {
          return ${u};
        }
        var data: array<${m}, 4> = array<${m}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${w}: ${m} = originalIdx + ${m}(i);
          if (${w} < 0 || ${w} >= ${n[y]}) {
            ${(()=>d?`coefs[i + 1] = 0.0;
                        continue;`:a?`return ${u};`:`${w} = max(0, min(${w}, ${n[y]} - 1));`)()};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet("input_indices_copy",y,`u32(${w})`)};
          data[i + 1] = ${y===p?e.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${h(p)};
    ${h(f)};
  fn getCubicInterpolationCoefs(s: ${m}) -> array<${m}, 4> {
    var absS = abs(s);
    var coeffs: array<${m}, 4> = array<${m}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${m} = 1.0 - absS;
    var twoMinusAbsS: ${m} = 2.0 - absS;
    var onePlusAbsS: ${m} = 1.0 + absS;
    coeffs[0] = ((${s} * onePlusAbsS - 5 * ${s}) * onePlusAbsS + 8 * ${s}) * onePlusAbsS - 4 * ${s};
    coeffs[1] = ((${s} + 2) * absS - (${s} + 3)) * absS * absS + 1;
    coeffs[2] = ((${s} + 2) * oneMinusAbsS - (${s} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${s} * twoMinusAbsS - 5 * ${s}) * twoMinusAbsS + 8 * ${s}) * twoMinusAbsS - 4 * ${s};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${m}, 4>, coefs: array<${m}, 4>) -> ${m} {
    var coefsSum: ${m} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${m} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},Yl=(e,t,n,r,o)=>{let[s,a,u,d,c]=n.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],l=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${l} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",a,`max(0, min(depth, ${n[a]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(height, ${n[u]} - 1))`)};
      ${e.indicesSet("input_indices",d,`max(0, min(width, ${n[d]} - 1))`)};
      ${$a(e,c,s,3)}
      return ${e.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${l} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${l} = originalIndices[${a}];
      var height:${l} = originalIndices[${u}];
      var width:${l} = originalIndices[${d}];
      ${r?`if (depth < 0 || depth > (${n[a]} - 1) || height < 0 || height > (${n[u]} - 1) || width < 0 || (width > ${n[d]} - 1)) {
      return ${o};
        }`:""};

    depth = max(0, min(depth, ${n[a]} - 1));
      height = max(0, min(height, ${n[u]} - 1));
      width = max(0, min(width, ${n[d]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${n.length>3?`u32(originalIndices[${c}])`:"0"};
      var batch: u32 =  ${n.length>3?`u32(originalIndices[${s}])`:"0"};

      var x111: ${l} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${l} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${l} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${l} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${l} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${l} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${l} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${l} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${l} = abs(depth - ${l}(depth1));
      var dx2: ${l} = abs(${l}(depth2) - depth);
      var dy1: ${l} = abs(height - ${l}(height1));
      var dy2: ${l} = abs(${l}(height2) - height);
      var dz1: ${l} = abs(width - ${l}(width1));
      var dz2: ${l} = abs(${l}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},Jl=(e,t,n,r,o,i)=>{let s=e.dims,a=Hl(i,t.axes,s.length),u=ql(s,r,o,t.axes),d=r.slice();r.length===0&&(d=s.map((g,b)=>g===0?1:u[b]/g),t.keepAspectRatioPolicy!=="stretch"&&(u=Fl(s,d,t)));let c=C("output",e.dataType,u.length),l=S("input",e.dataType,s.length),p=v.size(u),f=s.length===u.length&&s.every((g,b)=>g===u[b]),m=t.coordinateTransformMode==="tf_crop_and_resize",h=t.extrapolationValue,y=l.type.value,w=g=>`
      ${f?"":`
      ${Gl(t.coordinateTransformMode,y)};
      ${(()=>{switch(t.mode){case"nearest":return`
              ${Zl(l,s)};
              ${Ll(t.nearestMode,n,y)};
              ${jl(l,c,s,u,d.length,a.length,m)};
              `;case"linear":return`
              ${Kl(c,s,u,d.length,a.length)};
              ${(()=>{if(s.length===2||s.length===4)return`${Xl(l,c,s,m,h)}`;if(s.length===3||s.length===5)return`${Yl(l,c,s,m,h)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(s.length===2||s.length===4)return`${Ql(l,c,s,u,d,a,t.cubicCoeffA,m,t.extrapolationValue,t.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${g.registerUniform("output_size","u32").registerUniform("scales","f32",d.length).registerUniform("roi","f32",a.length).declareVariables(l,c)}
      ${g.mainStart()}
        ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${f?"output[global_idx] = input[global_idx];":`
        let output_indices = ${c.offsetToIndices("global_idx")};
        var input_indices: ${l.type.indices};
        ${(()=>{switch(t.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${l.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${s.length===2||s.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${n}|${d.length>0?d:""}|${o.length>0?o:""}|${a.length>0?a:""}|${f}|${s}`,inputDependencies:["rank"]},getShaderSource:w,getRunData:()=>({outputs:[{dims:u,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:[{type:12,data:p},{type:1,data:d},{type:1,data:a},...E(s,u)]})}},ec=e=>{let t=e.customDataBuffer;return new Uint32Array(t,t.byteOffset,1)[0]},_a=(e,t)=>{let n=[],r=[],o=[],i=ec(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");Wl(e.inputs,t,i,n,r,o),e.compute(Jl(e.inputs[0],t,i,n,r,o),{inputs:[0]})},va=e=>{let t=e.antialias,n=e.axes,r=e.coordinateTransformMode,o=e.cubicCoeffA,i=e.excludeOutside!==0,s=e.extrapolationValue,a=e.keepAspectRatioPolicy,u=e.mode,d=e.nearestMode===""?"simple":e.nearestMode;return M({antialias:t,axes:n,coordinateTransformMode:r,cubicCoeffA:o,excludeOutside:i,extrapolationValue:s,keepAspectRatioPolicy:a,mode:u,nearestMode:d})}});var tc,nc,Sa,Ia=A(()=>{"use strict";R();N();ie();G();tc=(e,t)=>{let[n,r,o,i]=e,{numHeads:s,rotaryEmbeddingDim:a}=t;if(n.dims.length!==3&&n.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${n.dims.length}`);if(!v.areEqual(r.dims,[])&&!v.areEqual(r.dims,[1])&&r.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${r.dims.length}`);if(o.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${o.dims.length}`);if(i.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${i.dims.length}`);if(!v.areEqual(o.dims,i.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(a>0&&s===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let u=n.dims[0],d=n.dims[n.dims.length-2],c=o.dims[0],l=v.sizeFromDimension(n.dims,1)/d,p=a===0?o.dims[1]*2:l/s;if(a>p)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(r.dims.length===2){if(u!==r.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${r.dims[0]}`);if(d!==r.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${r.dims[1]}`)}if(p/2!==o.dims[1]&&a/2!==o.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${o.dims[1]}`);if(d>c)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported")},nc=(e,t)=>{let{interleaved:n,numHeads:r,rotaryEmbeddingDim:o,scale:i}=t,s=e[0].dims[0],a=v.sizeFromDimension(e[0].dims,1),u=e[0].dims[e[0].dims.length-2],d=a/u,c=e[2].dims[1],l=o===0?c*2:d/r,p=new Array(s,u,d/l,l-c),f=v.computeStrides(p),m=[{type:1,data:i},{type:12,data:p},{type:12,data:f},...e[0].dims.length===3?new Array({type:12,data:[a,d,l,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[a,l,u*l,1]}):[],...E(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],h=y=>{let w=S("input",e[0].dataType,e[0].dims.length),g=S("position_ids",e[1].dataType,e[1].dims.length),b=S("cos_cache",e[2].dataType,e[2].dims.length),$=S("sin_cache",e[3].dataType,e[3].dims.length),_=C("output",e[0].dataType,e[0].dims.length);return y.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:p.length},{name:"global_strides",type:"u32",length:f.length},{name:"input_output_strides",type:"u32",length:f.length}]),`
        ${y.declareVariables(w,g,b,$,_)}

        ${y.mainStart(Fe)}
          let half_rotary_emb_dim = uniforms.${b.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${y.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${g.broadcastedIndicesToOffset("bsnh.xy",C("",g.type.tensor,2))};
            let position_id =
                u32(${g.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${n});
            let j = i + select(half_rotary_emb_dim, 1, ${n});
            let re = ${w.getByOffset("i")} * ${b.get("position_id","bsnh[3]")} -
                ${w.getByOffset("j")} * ${$.get("position_id","bsnh[3]")};
            ${_.setByOffset("i","re")}
            let im = ${w.getByOffset("i")} * ${$.get("position_id","bsnh[3]")} +
                ${w.getByOffset("j")} * ${b.get("position_id","bsnh[3]")};
            ${_.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${_.setByOffset("k",w.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:M({interleaved:n}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:h,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(v.size(p)/Fe)},programUniforms:m})}},Sa=(e,t)=>{tc(e.inputs,t),e.compute(nc(e.inputs,t))}});var rc,oc,Ca,Ta=A(()=>{"use strict";R();N();G();rc=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],n=e[1],r=e[2];if(t.dataType!==n.dataType||t.dataType!==r.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(n.dims.length!==3&&n.dims.length!==2)throw new Error("Skip must be 2D or 3D");let o=t.dims[t.dims.length-1],i=t.dims[t.dims.length-2];if(n.dims[n.dims.length-1]!==o)throw new Error("Skip must have the same hidden size as input");if(n.dims[n.dims.length-2]!==i)throw new Error("Skip must have the same sequence length as input");if(r.dims.length!==1)throw new Error("Gamma must be 1D");if(r.dims[r.dims.length-1]!==o)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let s=e[3];if(s.dims.length!==1)throw new Error("Beta must be 1D");if(s.dims[s.dims.length-1]!==o)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let s=e[4];if(s.dims.length!==1)throw new Error("Bias must be 1D");if(s.dims[s.dims.length-1]!==o)throw new Error("Bias must have the same hidden size as input")}},oc=(e,t,n,r)=>{let o=t.simplified,i=e[0].dims,s=v.size(i),a=i,u=s,d=i.slice(-1)[0],c=r?i.slice(0,-1).concat(1):[],l=!o&&e.length>3,p=e.length>4,f=r&&n>1,m=r&&n>2,h=n>3,y=64,w=ee(d),g=[{type:12,data:u},{type:12,data:w},{type:12,data:d},{type:1,data:t.epsilon}],b=_=>{let x=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],I=[S("x",e[0].dataType,e[0].dims,w),S("skip",e[1].dataType,e[1].dims,w),S("gamma",e[2].dataType,e[2].dims,w)];l&&I.push(S("beta",e[3].dataType,e[3].dims,w)),p&&I.push(S("bias",e[4].dataType,e[4].dims,w)),I.push(C("output",e[0].dataType,a,w)),f&&I.push(C("mean_output",1,c)),m&&I.push(C("inv_std_output",1,c)),h&&I.push(C("input_skip_bias_sum",e[0].dataType,a,w));let T=Q(e[0].dataType),P=Q(1,w);return`

      ${_.registerUniforms(x).declareVariables(...I)}
      var<workgroup> sum_shared : array<${P}, ${y}>;
      var<workgroup> sum_squared_shared : array<${P}, ${y}>;

      ${_.mainStart([y,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${y};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${y};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${y-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${p?"bias[offset1d + i]":T+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${h?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${Ke(T,w,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${y};
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${Ae("sum",w)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${Ae("square_sum",w)} / f32(uniforms.hidden_size) ${o?"":"- mean * mean"} + uniforms.epsilon);
        ${f?"mean_output[global_idx] = mean;":""}
        ${m?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${o?"":`- ${T}(mean)`}) *
            ${T}(inv_std_dev) * gamma[offset1d + i]
            ${l?"+ beta[offset1d + i]":""};
        }
      }`},$=[{dims:a,dataType:e[0].dataType}];return n>1&&$.push({dims:c,dataType:1}),n>2&&$.push({dims:c,dataType:1}),n>3&&$.push({dims:i,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${w};${f};${m};${h}`,inputDependencies:e.map((_,x)=>"type")},getShaderSource:b,getRunData:()=>({outputs:$,dispatchGroup:{x:Math.ceil(u/d)},programUniforms:g})}},Ca=(e,t)=>{rc(e.inputs);let r=[0];e.outputCount>1&&r.push(-3),e.outputCount>2&&r.push(-3),e.outputCount>3&&r.push(3),e.compute(oc(e.inputs,t,e.outputCount,!1),{outputs:r})}});var ic,rn,sc,Aa,ac,uc,ka,Ea,Pa=A(()=>{"use strict";R();N();ie();G();ic=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((n,r)=>{if(e[r+1].dataType!==6&&e[r+1].dataType!==7)throw new Error(`Input ${r} must be an array of int32 or int64`)})},rn=(e,t)=>{let n=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(r=>n.push(Number(r)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(r=>n.push(Number(r)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return n},sc=(e,t)=>{if(e.length>1){let n=rn(e,1),r=rn(e,2),o=rn(e,3);return o.length===0&&(o=[...Array(e[0].dims.length).keys()]),M({starts:n,ends:r,axes:o})}else return t},Aa=(e,t,n,r,o)=>{let i=e;return e<0&&(i+=n[r[t]]),o[t]<0?Math.max(0,Math.min(i,n[r[t]]-1)):Math.max(0,Math.min(i,n[r[t]]))},ac=(e,t,n)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${n.length}; i >= 0; i--) {
            let input_shape_i = ${O("uniforms.input_shape","i",n.length)};
            let steps_i = ${O("uniforms.steps","i",n.length)};
            let signs_i = ${O("uniforms.signs","i",n.length)};
            let starts_i = ${O("uniforms.starts","i",n.length)};
            var output_index = ${t.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,uc=(e,t)=>{let n=e[0].dims,r=v.size(n),o=t.axes.length>0?v.normalizeAxes(t.axes,n.length):[...Array(n.length).keys()],i=rn(e,4);i.forEach(w=>w!==0||(()=>{throw new Error("step cannot be 0")})),i.length===0&&(i=Array(o.length).fill(1));let s=t.starts.map((w,g)=>Aa(w,g,n,o,i)),a=t.ends.map((w,g)=>Aa(w,g,n,o,i));if(o.length!==s.length||o.length!==a.length)throw new Error("start, ends and axes should have the same number of elements");if(o.length!==n.length)for(let w=0;w<n.length;++w)o.includes(w)||(s.splice(w,0,0),a.splice(w,0,n[w]),i.splice(w,0,1));let u=i.map(w=>Math.sign(w));i.forEach((w,g,b)=>{if(w<0){let $=(a[g]-s[g])/w,_=s[g],x=_+$*i[g];s[g]=x,a[g]=_,b[g]=-w}});let d=n.slice(0);o.forEach((w,g)=>{d[w]=Math.ceil((a[w]-s[w])/i[w])});let c={dims:d,dataType:e[0].dataType},l=C("output",e[0].dataType,d.length),p=S("input",e[0].dataType,e[0].dims.length),f=v.size(d),m=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:s.length},{name:"signs",type:"i32",length:u.length},{name:"steps",type:"u32",length:i.length}],h=[{type:12,data:f},{type:12,data:s},{type:6,data:u},{type:12,data:i},...E(e[0].dims,d)],y=w=>`
      ${w.registerUniforms(m).declareVariables(p,l)}
        ${ac(p,l,n)}
        ${w.mainStart()}
          ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${l.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${l.setByOffset("global_idx",p.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${u.length}_${s.length}_${i.length}`,inputDependencies:["rank"]},getShaderSource:y,getRunData:()=>({outputs:[c],dispatchGroup:{x:Math.ceil(r/64)},programUniforms:h})}},ka=(e,t)=>{ic(e.inputs,t);let n=sc(e.inputs,t);e.compute(uc(e.inputs,n),{inputs:[0]})},Ea=e=>{let t=e.starts,n=e.ends,r=e.axes;return M({starts:t,ends:n,axes:r})}});var dc,lc,za,Oa,Ba=A(()=>{"use strict";R();N();ie();G();dc=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},lc=(e,t)=>{let n=e.dims,r=v.size(n),o=64,i=t.axis;if(i<0&&(i=n.length+i),i<n.length-1)throw new Error("softmax only supports last axis for now.");let s=n[i],a=r/s,u=ee(s),d=s/u,c=(y,w)=>w===4?`max(max(${y}.x, ${y}.y), max(${y}.z, ${y}.w))`:w===2?`max(${y}.x, ${y}.y)`:w===3?`max(max(${y}.x, ${y}.y), ${y}.z)`:y,l=S("x",e.dataType,e.dims,u),p=C("result",e.dataType,e.dims,u),f=l.type.value,m=Q(e.dataType)==="f32"?`var threadMax = ${f}(-3.402823e+38f);`:`var threadMax = ${f}(-65504.0h);`,h=y=>`
      var<workgroup> rowMaxShared : ${f};
      var<workgroup> rowSumShared : ${f};
      var<workgroup> threadShared : array<${f}, ${o}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${f} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${f}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${y.registerUniform("packedCols","i32").declareVariables(l,p)}
      ${y.mainStart()}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${o};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${m}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${f}(${c("threadShared[0]",u)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${f}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${f}(${Ae("threadShared[0]",u)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          let value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          setValue(row, col, row_stride, value);
        }
      }`;return{name:"Softmax",shaderCache:{hint:`${u}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:a},programUniforms:[{type:6,data:d}]}),getShaderSource:h}},za=(e,t)=>{dc(e.inputs),e.compute(lc(e.inputs[0],t))},Oa=e=>M({axis:e.axis})});var cc,pc,mc,fc,hc,Da,Ra,Ua=A(()=>{"use strict";R();N();ie();G();cc=e=>{if(!e||e.length<1)throw new Error("too few inputs")},pc=(e,t)=>{let n=[],r=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(o=>n.push(Number(o))),r=n.length),M({numOutputs:r,axis:t.axis,splitSizes:n})},mc=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${O("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,fc=e=>{let t=e.length,n=[];for(let r=0;r<t;++r){let o=e[r].setByIndices("indices","input[global_idx]");t===1?n.push(o):r===0?n.push(`if (output_number == ${r}u) { ${o} }`):r===t-1?n.push(`else { ${o} }`):n.push(`else if (output_number == ${r}) { ${o} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${n.join(`
`)}
      }`},hc=(e,t)=>{let n=e[0].dims,r=v.size(n),o=e[0].dataType,i=v.normalizeAxis(t.axis,n.length),s=new Array(t.numOutputs),a=S("input",o,n.length),u=new Array(t.numOutputs),d=[],c=[],l=0,p=[{type:12,data:r}];for(let m=0;m<t.numOutputs;m++){l+=t.splitSizes[m],u[m]=l;let h=n.slice();h[i]=t.splitSizes[m],c.push(h),s[m]=C(`output${m}`,o,h.length),d.push({dims:c[m],dataType:e[0].dataType})}p.push({type:12,data:u},...E(n,...c));let f=m=>`
  ${m.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",u.length).declareVariables(a,...s)}
  ${mc(u.length)}
  ${fc(s)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${a.offsetToIndices("global_idx")};
    var index = ${a.indicesGet("indices",i)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${O("uniforms.size_in_split_axis","output_number - 1u",u.length)};
      ${a.indicesSet("indices",i,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:f,getRunData:()=>({outputs:d,dispatchGroup:{x:Math.ceil(r/64)},programUniforms:p})}},Da=(e,t)=>{cc(e.inputs);let n=e.inputs.length===1?t:pc(e.inputs,t);e.compute(hc(e.inputs,n),{inputs:[0]})},Ra=e=>{let t=e.axis,n=e.splitSizes,r=e.numOutputs<0?n.length:e.numOutputs;if(r!==n.length)throw new Error("numOutputs and splitSizes lengh must be equal");return M({axis:t,numOutputs:r,splitSizes:n})}});var gc,yc,Ma,Va=A(()=>{"use strict";R();N();G();gc=(e,t,n,r,o)=>{let i=C("output_data",o,n.length,4),s=S("a_data",t[1].dataType,t[1].dims.length,4),a=S("b_data",t[2].dataType,t[2].dims.length,4),u=S("c_data",t[0].dataType,t[0].dims.length,4),d,c=(l,p,f)=>`select(${p}, ${l}, ${f})`;if(!r)d=i.setByOffset("global_idx",c(s.getByOffset("global_idx"),a.getByOffset("global_idx"),u.getByOffset("global_idx")));else{let l=(p,f,m="")=>{let h=`a_data[index_a${f}][component_a${f}]`,y=`b_data[index_b${f}][component_b${f}]`,w=`bool(c_data[index_c${f}] & (0xffu << (component_c${f} * 8)))`;return`
            let output_indices${f} = ${i.offsetToIndices(`global_idx * 4u + ${f}u`)};
            let offset_a${f} = ${s.broadcastedIndicesToOffset(`output_indices${f}`,i)};
            let offset_b${f} = ${a.broadcastedIndicesToOffset(`output_indices${f}`,i)};
            let offset_c${f} = ${u.broadcastedIndicesToOffset(`output_indices${f}`,i)};
            let index_a${f} = offset_a${f} / 4u;
            let index_b${f} = offset_b${f} / 4u;
            let index_c${f} = offset_c${f} / 4u;
            let component_a${f} = offset_a${f} % 4u;
            let component_b${f} = offset_b${f} % 4u;
            let component_c${f} = offset_c${f} % 4u;
            ${p}[${f}] = ${m}(${c(h,y,w)});
          `};o===9?d=`
            var data = vec4<u32>(0);
            ${l("data",0,"u32")}
            ${l("data",1,"u32")}
            ${l("data",2,"u32")}
            ${l("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:d=`
            ${l("output_data[global_idx]",0)}
            ${l("output_data[global_idx]",1)}
            ${l("output_data[global_idx]",2)}
            ${l("output_data[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(u,s,a,i)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${d}
      }`},yc=e=>{let t=e[1].dims,n=e[2].dims,r=e[0].dims,o=e[1].dataType,i=!(v.areEqual(t,n)&&v.areEqual(n,r)),s=t,a=v.size(t);if(i){let d=ke.calcShape(ke.calcShape(t,n,!1),r,!1);if(!d)throw new Error("Can't perform where op on the given tensors");s=d,a=v.size(s)}let u=Math.ceil(a/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:d=>gc(d,e,s,i,o),getRunData:()=>({outputs:[{dims:s,dataType:o}],dispatchGroup:{x:Math.ceil(a/64/4)},programUniforms:[{type:12,data:u},...E(r,t,n,s)]})}},Ma=e=>{e.compute(yc(e.inputs))}});var Na,Wa=A(()=>{"use strict";Bo();Ft();Uo();Vo();Si();Di();Mi();Vn();os();as();ls();hs();bs();$s();xs();Cs();ks();zs();Gs();Hs();Fs();Wn();Zs();Xn();Qs();fa();ya();wa();Ht();xa();Ia();Ta();Pa();Ba();Ua();Yn();je();jt();Va();Na=new Map([["Abs",[No]],["Acos",[Wo]],["Acosh",[Go]],["Add",[Ii]],["ArgMax",[Oo,Dn]],["ArgMin",[zo,Dn]],["Asin",[Lo]],["Asinh",[Ho]],["Atan",[qo]],["Atanh",[Fo]],["Attention",[Do]],["AveragePool",[ia,oa]],["BatchNormalization",[Ro]],["BiasAdd",[Mo]],["BiasSplitGelu",[xi]],["Cast",[jo,Ko]],["Ceil",[Xo]],["Clip",[Zo]],["Concat",[Ri,Ui]],["Conv",[qn,Hn]],["ConvTranspose",[rs,ns]],["Cos",[Qo]],["Cosh",[Yo]],["CumSum",[is,ss]],["DepthToSpace",[us,ds]],["DequantizeLinear",[ha,ga]],["Div",[Ci]],["Einsum",[ms,fs]],["Elu",[Jo,dt]],["Equal",[Ti]],["Erf",[ei]],["Exp",[ti]],["Expand",[ys]],["FastGelu",[ws]],["Floor",[ni]],["FusedConv",[qn,Hn]],["Gather",[vs,_s]],["GatherElements",[As,Ts]],["GatherBlockQuantized",[Ss,Is]],["Gelu",[ri]],["Gemm",[Ps,Es]],["GlobalAveragePool",[ua,aa]],["GlobalMaxPool",[ma,pa]],["Greater",[Pi]],["GreaterOrEqual",[Oi]],["GroupQueryAttention",[Ws,Ns]],["HardSigmoid",[ci,li]],["InstanceNormalization",[Ls]],["LayerNormalization",[qs]],["LeakyRelu",[oi,dt]],["Less",[zi]],["LessOrEqual",[Bi]],["Log",[$i]],["MatMul",[Xi]],["MatMulNBits",[Ks,js]],["MaxPool",[la,ca]],["Mul",[Ai]],["MultiHeadAttention",[Ds,Bs]],["Neg",[si]],["Not",[ii]],["Pad",[Xs]],["Pow",[ki]],["QuickGelu",[_i,dt]],["Range",[ba]],["Reciprocal",[ai]],["ReduceMin",[Co]],["ReduceMean",[_o]],["ReduceMax",[Io]],["ReduceSum",[Ao]],["ReduceProd",[To]],["ReduceL1",[vo]],["ReduceL2",[xo]],["ReduceLogSum",[Eo]],["ReduceLogSumExp",[So]],["ReduceSumSquare",[ko]],["Relu",[ui]],["Resize",[_a,va]],["RotaryEmbedding",[Sa]],["Sigmoid",[di]],["Sin",[pi]],["Sinh",[mi]],["Slice",[ka,Ea]],["SkipLayerNormalization",[Ca]],["Split",[Da,Ra]],["Sqrt",[fi]],["Softmax",[za,Oa]],["Sub",[Ei]],["Tan",[hi]],["Tanh",[yi]],["ThresholdedRelu",[wi,dt]],["Tile",[Us]],["Transpose",[ao,uo]],["Where",[Ma]]])});var on,Ga=A(()=>{"use strict";Se();De();G();on=class{constructor(t){this.backend=t;this.repo=new Map,this.attributesBound=!1}getArtifact(t){return this.repo.get(t)}setArtifact(t,n){this.repo.set(t,n)}run(t,n,r,o,i){$e(t.programInfo.name);let s=this.backend.device,a=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let u=[];for(let c of n)u.push({binding:u.length,resource:{buffer:c.buffer}});for(let c of r)u.push({binding:u.length,resource:{buffer:c.buffer}});i&&u.push({binding:u.length,resource:i});let d=s.createBindGroup({layout:t.computePipeline.getBindGroupLayout(0),entries:u,label:t.programInfo.name});if(this.backend.sessionStatus==="capturing"){let c={kernelId:this.backend.currentKernelId,computePipeline:t.computePipeline,bindGroup:d,dispatchGroup:o};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(c)}a.setPipeline(t.computePipeline),a.setBindGroup(0,d),a.dispatchWorkgroups(...o),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),fe(t.programInfo.name)}dispose(){}build(t,n){$e(t.name);let r=this.backend.device,o=[];r.features.has("shader-f16")&&o.push("enable f16;");let i=io(n,this.backend.device.limits),s=t.getShaderSource(i),a=`${o.join(`
`)}
${i.additionalImplementations}
${s}`,u=r.createShaderModule({code:a,label:t.name});J("verbose",()=>`[WebGPU] ${t.name} shader code: ${a}`);let d=r.createComputePipeline({compute:{module:u,entryPoint:"main"},layout:"auto",label:t.name});return fe(t.name),{programInfo:t,computePipeline:d,uniformVariablesInfo:i.variablesInfo}}normalizeDispatchGroupSize(t){let n=typeof t=="number"?t:t.x,r=typeof t=="number"?1:t.y||1,o=typeof t=="number"?1:t.z||1,i=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(n<=i&&r<=i&&o<=i)return[n,r,o];let s=n*r*o,a=Math.ceil(Math.sqrt(s));if(a>i){if(a=Math.ceil(Math.cbrt(s)),a>i)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[a,a,a]}else return[a,a,1]}}});var bc,wc,Jn,sn,La=A(()=>{"use strict";Se();R();De();Jr();oo();Wa();Ga();bc=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let n=[];for(let r=0;r<e.length;++r){let o=e[r].dataType;switch(t[r]){case"none":{n.push("");break}case"type":{n.push(`${o}`);break}case"rank":{let i=e[r].dims.length;n.push(`${o};${i}`);break}case"dims":{let i=e[r].dims.join(",");n.push(`${o};${i}`);break}default:throw new Error(`unsupported input dependency: ${t[r]}`)}}return n.join("|")},wc=(e,t,n)=>{let r=e.name;return e.shaderCache?.hint&&(r+="["+e.shaderCache.hint+"]"),r+=":"+n+`:${bc(t,e.shaderCache?.inputDependencies??new Array(t.length).fill("dims"))}`,r},Jn=class{constructor(t){t&&(this.architecture=t.architecture,this.vendor=t.vendor)}isArchitecture(t){return this.architecture===t}isVendor(t){return this.vendor===t}},sn=class{constructor(){this.currentSessionId=null;this.currentKernelId=null;this.commandEncoder=null;this.computePassEncoder=null;this.maxDispatchNumber=16;this.pendingDispatchNumber=0;this.pendingKernels=[];this.pendingQueries=new Map;this.sessionStatus="default";this.capturedCommandList=new Map;this.capturedPendingKernels=new Map;this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let t=this.kernelCustomData.get(this.currentKernelId);return t||(t={},this.kernelCustomData.set(this.currentKernelId,t)),t}async initialize(t,n){this.env=t;let r=[],o={requiredLimits:{maxComputeWorkgroupStorageSize:n.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:n.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:n.limits.maxStorageBufferBindingSize,maxBufferSize:n.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:n.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:n.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:n.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:n.limits.maxComputeWorkgroupSizeZ},requiredFeatures:r};n.features.has("chromium-experimental-timestamp-query-inside-passes")?r.push("chromium-experimental-timestamp-query-inside-passes"):n.features.has("timestamp-query")&&r.push("timestamp-query"),n.features.has("shader-f16")&&r.push("shader-f16"),this.device=await n.requestDevice(o),this.adapterInfo=new Jn(n.info||await n.requestAdapterInfo()),this.gpuDataManager=ro(this),this.programManager=new on(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,Qr(t.logLevel,!!t.debug),this.device.onuncapturederror=i=>{i.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${i.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!1}),Object.defineProperty(this.env.webgpu,"adapter",{value:n,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose()}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let t=this.getCommandEncoder(),n={};this.queryType==="at-passes"&&(n.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=t.beginComputePass(n)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;$e(),this.endComputePass();let t;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),t=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(t,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,t,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&t.mapAsync(GPUMapMode.READ).then(()=>{let n=new BigUint64Array(t.getMappedRange()),r=this.pendingQueries.get(t);for(let o=0;o<n.length/2;o++){let i=r[o],s=i.kernelId,a=this.kernels.get(s),u=a.kernelType,d=a.kernelName,c=i.programName,l=i.inputTensorViews,p=i.outputTensorViews,f=n[o*2],m=n[o*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=f);let h=Number(f-this.queryTimeBase),y=Number(m-this.queryTimeBase);if(!Number.isSafeInteger(h)||!Number.isSafeInteger(y))throw new RangeError("incorrect timestamp range");if(this.env.webgpu.profiling?.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:l.map(w=>({dims:w.dims,dataType:Ue(w.dataType)})),outputsMetadata:p.map(w=>({dims:w.dims,dataType:Ue(w.dataType)})),kernelId:s,kernelType:u,kernelName:d,programName:c,startTime:h,endTime:y});else{let w="";l.forEach((b,$)=>{w+=`input[${$}]: [${b.dims}] | ${Ue(b.dataType)}, `});let g="";p.forEach((b,$)=>{g+=`output[${$}]: [${b.dims}] | ${Ue(b.dataType)}, `}),console.log(`[profiling] kernel "${s}|${u}|${d}|${c}" ${w}${g}execution time: ${y-h} ns`)}xt("GPU",`${c}::${f}::${m}`)}t.unmap(),this.pendingQueries.delete(t)}),fe()}run(t,n,r,o,i,s){$e(t.name);let a=[];for(let b=0;b<n.length;++b){let $=n[b].data;if($===0)continue;let _=this.gpuDataManager.get($);if(!_)throw new Error(`no GPU data for input: ${$}`);a.push(_)}let{outputs:u,dispatchGroup:d,programUniforms:c}=t.getRunData(n),l=r.length===0?u.map((b,$)=>$):r;if(l.length!==u.length)throw new Error(`Output size ${l.length} must be equal to ${u.length}.`);let p=[],f=[];for(let b=0;b<u.length;++b){if(!Number.isInteger(l[b])||l[b]<-3||l[b]>=s)throw new Error(`Invalid output index: ${l[b]}`);if(l[b]===-3)continue;let $=l[b]===-1,_=l[b]===-2,x=$||_?i(u[b].dataType,u[b].dims):o(l[b],u[b].dataType,u[b].dims);if(p.push(x),x.data===0)continue;let I=this.gpuDataManager.get(x.data);if(!I)throw new Error(`no GPU data for output: ${x.data}`);if($&&this.temporaryData.push(I),_){let T=this.kernelPersistentData.get(this.currentKernelId);T||(T=[],this.kernelPersistentData.set(this.currentKernelId,T)),T.push(I)}f.push(I)}if(a.length!==n.length||f.length!==p.length){if(f.length===0)return fe(t.name),p;throw new Error(`Program ${t.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let m;if(c){let b=0,$=[];c.forEach(T=>{let P=typeof T.data=="number"?[T.data]:T.data;if(P.length===0)return;let z=T.type===10?2:4,D,j;T.type===10?(j=P.length>4?16:P.length>2?8:P.length*z,D=P.length>4?16:z*P.length):(j=P.length<=2?P.length*z:16,D=16),b=Math.ceil(b/j)*j,$.push(b);let L=T.type===10?8:4;b+=P.length>4?Math.ceil(P.length/L)*D:P.length*z});let _=16;b=Math.ceil(b/_)*_;let x=new ArrayBuffer(b);c.forEach((T,P)=>{let z=$[P],D=typeof T.data=="number"?[T.data]:T.data;if(T.type===6)new Int32Array(x,z,D.length).set(D);else if(T.type===12)new Uint32Array(x,z,D.length).set(D);else if(T.type===10)new Uint16Array(x,z,D.length).set(D);else if(T.type===1)new Float32Array(x,z,D.length).set(D);else throw new Error(`Unsupported uniform type: ${Ue(T.type)}`)});let I=this.gpuDataManager.create(b,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(I.buffer,0,x,0,b),this.gpuDataManager.release(I.id),m={offset:0,size:b,buffer:I.buffer}}let h=this.programManager.normalizeDispatchGroupSize(d),y=h[1]===1&&h[2]===1,w=wc(t,n,y),g=this.programManager.getArtifact(w);if(g||(g=this.programManager.build(t,h),this.programManager.setArtifact(w,g),J("info",()=>`[artifact] key: ${w}, programName: ${t.name}`)),c&&g.uniformVariablesInfo){if(c.length!==g.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${g.uniformVariablesInfo.length}, got ${c.length} in program "${g.programInfo.name}".`);for(let b=0;b<c.length;b++){let $=c[b],_=$.type,x=typeof $.data=="number"?1:$.data.length,[I,T]=g.uniformVariablesInfo[b];if(_!==I||x!==T)throw new Error(`Uniform variable ${b} mismatch: expect type ${I} with size ${T}, got type ${_} with size ${x} in program "${g.programInfo.name}".`)}}if(J("info",()=>`[ProgramManager] run "${t.name}" (key=${w}) with ${h[0]}x${h[1]}x${h[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let b={kernelId:this.currentKernelId,programName:g.programInfo.name,inputTensorViews:n,outputTensorViews:p};this.pendingKernels.push(b),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(b)}return this.programManager.run(g,a,f,h,m),fe(t.name),p}upload(t,n){this.gpuDataManager.upload(t,n)}memcpy(t,n){this.gpuDataManager.memcpy(t,n)}async download(t,n){await this.gpuDataManager.download(t,n)}alloc(t){return this.gpuDataManager.create(t).id}free(t){return this.gpuDataManager.release(t)}createKernel(t,n,r,o){let i=Na.get(t);if(!i)throw new Error(`kernel not implemented: ${t}`);let s={kernelType:t,kernelName:o,kernelEntry:i[0],attributes:[i[1],r]};this.kernels.set(n,s)}releaseKernel(t){let n=this.kernelPersistentData.get(t);if(n){for(let r of n)this.gpuDataManager.release(r.id);this.kernelPersistentData.delete(t)}this.kernelCustomData.delete(t),this.kernels.delete(t)}computeKernel(t,n,r){let o=this.kernels.get(t);if(!o)throw new Error(`kernel not created: ${t}`);let i=o.kernelType,s=o.kernelName,a=o.kernelEntry,u=o.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${i}] ${s}" is not allowed to be called recursively`);this.currentKernelId=t,u[0]&&(u[1]=u[0](u[1]),u[0]=void 0),J("info",()=>`[WebGPU] Start to run kernel "[${i}] ${s}"...`);let d=this.env.debug;this.temporaryData=[];try{return d&&this.device.pushErrorScope("validation"),a(n,u[1]),0}catch(c){return r.push(Promise.resolve(`[WebGPU] Kernel "[${i}] ${s}" failed. ${c}`)),1}finally{d&&r.push(this.device.popErrorScope().then(c=>c?`GPU validation error for kernel "[${i}] ${s}": ${c.message}`:null));for(let c of this.temporaryData)this.gpuDataManager.release(c.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(t,n,r,o){let i=this.sessionExternalDataMapping.get(t);i||(i=new Map,this.sessionExternalDataMapping.set(t,i));let s=i.get(n),a=this.gpuDataManager.registerExternalBuffer(r,o,s?.[1]);return i.set(n,[a,r]),a}unregisterBuffers(t){let n=this.sessionExternalDataMapping.get(t);n&&(n.forEach(r=>this.gpuDataManager.unregisterExternalBuffer(r[1])),this.sessionExternalDataMapping.delete(t))}getBuffer(t){let n=this.gpuDataManager.get(t);if(!n)throw new Error(`no GPU data for buffer: ${t}`);return n.buffer}createDownloader(t,n,r){return async()=>{let o=await An(this,t,n);return Yr(o.buffer,r)}}writeTimestamp(t){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,t)}setQueryType(){this.queryType="none",(this.env.webgpu.profiling?.mode==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){J("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){J("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){J("info","replay"),this.sessionStatus="replaying";let t=this.capturedCommandList.get(this.currentSessionId),n=this.capturedPendingKernels.get(this.currentSessionId),r=t.length;this.pendingKernels=[];for(let o=0;o<r;o++){let i=this.getComputePassEncoder(),s=t[o];this.writeTimestamp(this.pendingDispatchNumber*2),i.setPipeline(s.computePipeline),i.setBindGroup(0,s.bindGroup),i.dispatchWorkgroups(...s.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(n[o]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onReleaseSession(t){this.unregisterBuffers(t),this.capturedCommandList.has(t)&&this.capturedCommandList.delete(t),this.capturedPendingKernels.has(t)&&this.capturedPendingKernels.delete(t),this.gpuDataManager.onReleaseSession(t)}onRunStart(t){this.currentSessionId=t,this.setQueryType()}}});var Ha={};yt(Ha,{init:()=>$c});var ht,er,$c,qa=A(()=>{"use strict";R();La();De();N();ht=class e{constructor(t,n,r,o){this.module=t;this.dataType=n;this.data=r;this.dims=o}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=v.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=v.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=v.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=v.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(v.size(t)!==v.size(this.dims))throw new Error("Invalid new shape");return new e(this.module,this.dataType,this.data,t)}},er=class{constructor(t,n,r){this.module=t;this.backend=n;this.customDataOffset=0;this.customDataSize=0;this.adapterInfo=n.adapterInfo;let o=t.HEAPU32,i=r>>>2;this.opKernelContext=o[i++];let s=o[i++];this.outputCount=o[i++],this.customDataOffset=o[i++],this.customDataSize=o[i++];let a=[];for(let u=0;u<s;u++){let d=o[i++],c=o[i++],l=o[i++],p=[];for(let f=0;f<l;f++)p.push(o[i++]);a.push(new ht(t,d,c,p))}this.inputs=a}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}getMaxComputeWorkgroupSizes(){return[this.backend.device.limits.maxComputeWorkgroupSizeX,this.backend.device.limits.maxComputeWorkgroupSizeY,this.backend.device.limits.maxComputeWorkgroupSizeZ]}getMaxComputeWorkgroupStoragesize(){return this.backend.device.limits.maxComputeWorkgroupStorageSize}compute(t,n){let r=n?.inputs?.map(a=>typeof a=="number"?this.inputs[a]:a)??this.inputs,o=n?.outputs??[],i=(a,u,d)=>new ht(this.module,u,this.output(a,d),d),s=(a,u)=>{let d=st(a,u);if(!d)throw new Error(`Unsupported data type: ${a}`);let c=d>0?this.backend.gpuDataManager.create(d).id:0;return new ht(this.module,a,c,u)};return this.backend.run(t,r,o,i,s,this.outputCount)}output(t,n){let r=this.module.stackSave();try{let o=this.module.stackAlloc((1+n.length)*4),i=o>>2;this.module.HEAPU32[i++]=n.length;for(let s=0;s<n.length;s++)this.module.HEAPU32[i++]=n[s];return this.module._JsepOutput(this.opKernelContext,t,o)}catch(o){throw new Error(`Failed to generate kernel's output[${t}] with dims [${n}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${o}`)}finally{this.module.stackRestore(r)}}},$c=async(e,t,n,r)=>{let o=t.jsepInit;if(!o)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let i=new sn;await i.initialize(n,r),o("webgpu",[i,s=>i.alloc(s),s=>i.free(s),(s,a,u,d=!1)=>{if(d)J("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${s}, dst=${a}, size=${u}`),i.memcpy(s,a);else{J("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${s}, gpuDataId=${a}, size=${u}`);let c=t.HEAPU8.subarray(s>>>0,(s>>>0)+u);i.upload(a,c)}},async(s,a,u)=>{J("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${s}, dataOffset=${a}, size=${u}`),await i.download(s,()=>t.HEAPU8.subarray(a>>>0,(a>>>0)+u))},(s,a,u)=>i.createKernel(s,a,u,t.UTF8ToString(t._JsepGetNodeName(a))),s=>i.releaseKernel(s),(s,a,u,d)=>{J("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${u}, kernel=${s}, contextDataOffset=${a}`);let c=new er(t,i,a);return i.computeKernel(s,c,d)},()=>i.captureBegin(),()=>i.captureEnd(),()=>i.replay()])}else o("webnn")}});var _c,At,kt,Ze,vc,ot,Et,Pt,Fa,zt,Ot,Bt,wn=A(()=>{"use strict";Fr();jr();R();Le();Rt();Sn();_c=(e,t)=>{se()._OrtInit(e,t)!==0&&oe("Can't initialize onnxruntime.")},At=async e=>{_c(e.wasm.numThreads,at(e.logLevel))},kt=async(e,t)=>{{let n=(qa(),fn(Ha)).init;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");let r=e.webgpu.adapter;if(r){if(typeof r.limits!="object"||typeof r.features!="object"||typeof r.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let o=e.webgpu.powerPreference;if(o!==void 0&&o!=="low-power"&&o!=="high-performance")throw new Error(`Invalid powerPreference setting: "${o}"`);let i=e.webgpu.forceFallbackAdapter;if(i!==void 0&&typeof i!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${i}"`);if(r=await navigator.gpu.requestAdapter({powerPreference:o,forceFallbackAdapter:i}),!r)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}await n("webgpu",se(),e,r)}if(t==="webnn"){if(typeof navigator>"u"||!navigator.ml)throw new Error("WebNN is not supported in current environment");await n("webnn",se(),e)}}},Ze=new Map,vc=e=>{let t=se(),n=t.stackSave();try{let r=t.stackAlloc(8);return t._OrtGetInputOutputCount(e,r,r+4)!==0&&oe("Can't get session input/output count."),[t.HEAP32[r/4],t.HEAP32[r/4+1]]}finally{t.stackRestore(n)}},ot=e=>{let t=se(),n=t._malloc(e.byteLength);if(n===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,n),[n,e.byteLength]},Et=async(e,t)=>{let n,r,o=se();Array.isArray(e)?[n,r]=e:e.buffer===o.HEAPU8.buffer?[n,r]=[e.byteOffset,e.byteLength]:[n,r]=ot(e);let i=0,s=0,a=0,u=[],d=[],c=[];try{if([s,u]=Kr(t),t?.externalData&&o.mountExternalData){let g=[];for(let b of t.externalData){let $=typeof b=="string"?b:b.path;g.push(ut(typeof b=="string"?b:b.data).then(_=>{o.mountExternalData($,_)}))}await Promise.all(g)}for(let g of t?.executionProviders??[])if((typeof g=="string"?g:g.name)==="webnn"){if(o.currentContext)throw new Error("WebNN execution provider is already set.");if(typeof g!="string"){let $=g,_=$?.context,x=$?.gpuDevice,I=$?.deviceType,T=$?.numThreads,P=$?.powerPreference;_?o.currentContext=_:x?o.currentContext=await navigator.ml.createContext(x):o.currentContext=await navigator.ml.createContext({deviceType:I,numThreads:T,powerPreference:P})}else o.currentContext=await navigator.ml.createContext();break}i=await o._OrtCreateSession(n,r,s),i===0&&oe("Can't create a session."),o.currentContext&&(o.currentContext=void 0);let[l,p]=vc(i),f=!!t?.enableGraphCapture,m=[],h=[],y=[];for(let g=0;g<l;g++){let b=o._OrtGetInputName(i,g);b===0&&oe("Can't get an input name."),d.push(b),m.push(o.UTF8ToString(b))}for(let g=0;g<p;g++){let b=o._OrtGetOutputName(i,g);b===0&&oe("Can't get an output name."),c.push(b);let $=o.UTF8ToString(b);h.push($);{if(f&&t?.preferredOutputLocation===void 0){y.push("gpu-buffer");continue}let _=typeof t?.preferredOutputLocation=="string"?t.preferredOutputLocation:t?.preferredOutputLocation?.[$]??"cpu";if(_!=="cpu"&&_!=="cpu-pinned"&&_!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${_}.`);if(f&&_!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${_}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);y.push(_)}}let w=null;return y.some(g=>g==="gpu-buffer")&&(a=o._OrtCreateBinding(i),a===0&&oe("Can't create IO binding."),w={handle:a,outputPreferredLocations:y,outputPreferredLocationsEncoded:y.map(g=>xn(g))}),Ze.set(i,[i,d,c,w,f,!1]),[i,m,h]}catch(l){throw d.forEach(p=>o._OrtFree(p)),c.forEach(p=>o._OrtFree(p)),a!==0&&o._OrtReleaseBinding(a),i!==0&&o._OrtReleaseSession(i),l}finally{o._free(n),s!==0&&o._OrtReleaseSessionOptions(s),u.forEach(l=>o._free(l)),o.unmountExternalData?.()}},Pt=e=>{let t=se(),n=Ze.get(e);if(!n)throw new Error(`cannot release session. invalid session id: ${e}`);let[r,o,i,s,a]=n;s&&(a&&t._OrtClearBoundOutputs(s.handle),t._OrtReleaseBinding(s.handle)),t.jsepOnReleaseSession?.(e),o.forEach(u=>t._OrtFree(u)),i.forEach(u=>t._OrtFree(u)),t._OrtReleaseSession(r),Ze.delete(e)},Fa=(e,t,n,r,o,i=!1)=>{if(!e){t.push(0);return}let s=se(),a=e[0],u=e[1],d=e[3],c,l;if(a==="string"&&d==="gpu-buffer")throw new Error("String tensor is not supported on GPU.");if(i&&d!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${o} when enableGraphCapture is true.`);if(d==="gpu-buffer"){let m=e[2].gpuBuffer;l=st(vn(a),u);let h=s.jsepRegisterBuffer;if(!h)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');c=h(r,o,m,l)}else{let m=e[2];if(Array.isArray(m)){l=4*m.length,c=s._malloc(l),n.push(c);let h=c/4;for(let y=0;y<m.length;y++){if(typeof m[y]!="string")throw new TypeError(`tensor data at index ${y} is not a string`);s.HEAPU32[h++]=ue(m[y],n)}}else l=m.byteLength,c=s._malloc(l),n.push(c),s.HEAPU8.set(new Uint8Array(m.buffer,m.byteOffset,l),c)}let p=s.stackSave(),f=s.stackAlloc(4*u.length);try{let m=f/4;u.forEach(y=>s.HEAP32[m++]=y);let h=s._OrtCreateTensor(vn(a),c,l,f,u.length,xn(d));h===0&&oe(`Can't create tensor for input/output. session=${r}, index=${o}.`),t.push(h)}finally{s.stackRestore(p)}},zt=async(e,t,n,r,o,i)=>{let s=se(),a=Ze.get(e);if(!a)throw new Error(`cannot run inference. invalid session id: ${e}`);let u=a[0],d=a[1],c=a[2],l=a[3],p=a[4],f=a[5],m=t.length,h=r.length,y=0,w=[],g=[],b=[],$=[],_=s.stackSave(),x=s.stackAlloc(m*4),I=s.stackAlloc(m*4),T=s.stackAlloc(h*4),P=s.stackAlloc(h*4);try{[y,w]=qr(i);for(let U=0;U<m;U++)Fa(n[U],g,$,e,t[U],p);for(let U=0;U<h;U++)Fa(o[U],b,$,e,m+r[U],p);let z=x/4,D=I/4,j=T/4,L=P/4;for(let U=0;U<m;U++)s.HEAPU32[z++]=g[U],s.HEAPU32[D++]=d[t[U]];for(let U=0;U<h;U++)s.HEAPU32[j++]=b[U],s.HEAPU32[L++]=c[r[U]];if(l&&!f){let{handle:U,outputPreferredLocations:te,outputPreferredLocationsEncoded:re}=l;if(d.length!==m)throw new Error(`input count from feeds (${m}) is expected to be always equal to model's input count (${d.length}).`);for(let V=0;V<m;V++){let ne=t[V];await s._OrtBindInput(U,d[ne],g[V])!==0&&oe(`Can't bind input[${V}] for session=${e}.`)}for(let V=0;V<h;V++){let ne=r[V];o[V]?.[3]?s._OrtBindOutput(U,c[ne],b[V],0)!==0&&oe(`Can't bind pre-allocated output[${V}] for session=${e}.`):s._OrtBindOutput(U,c[ne],0,re[ne])!==0&&oe(`Can't bind output[${V}] to ${te[V]} for session=${e}.`)}Ze.set(e,[u,d,c,l,p,!0])}s.jsepOnRunStart?.(u);let q;l?q=await s._OrtRunWithBinding(u,l.handle,h,T,y):q=await s._OrtRun(u,I,x,m,P,h,T,y),q!==0&&oe("failed to call OrtRun().");let ae=[];for(let U=0;U<h;U++){let te=s.HEAPU32[T/4+U];if(te===b[U]){ae.push(o[U]);continue}let re=s.stackSave(),V=s.stackAlloc(4*4),ne=!1,F,H=0;try{s._OrtGetTensorData(te,V,V+4,V+8,V+12)!==0&&oe(`Can't access output tensor data on index ${U}.`);let k=V/4,B=s.HEAPU32[k++];H=s.HEAPU32[k++];let Y=s.HEAPU32[k++],Te=s.HEAPU32[k++],me=[];for(let ye=0;ye<Te;ye++)me.push(s.HEAPU32[Y/4+ye]);s._OrtFree(Y);let Ve=me.reduce((ye,be)=>ye*be,1);F=Ue(B);let or=l?.outputPreferredLocations[r[U]];if(F==="string"){if(or==="gpu-buffer")throw new Error("String tensor is not supported on GPU.");let ye=[],be=H/4;for(let Qe=0;Qe<Ve;Qe++){let ir=s.HEAPU32[be++],iu=Qe===Ve-1?void 0:s.HEAPU32[be]-ir;ye.push(s.UTF8ToString(ir,iu))}ae.push([F,me,ye,"cpu"])}else if(or==="gpu-buffer"&&Ve>0){let ye=s.jsepGetBuffer;if(!ye)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let be=ye(H),Qe=st(B,Ve);if(Qe===void 0||!Mt(F))throw new Error(`Unsupported data type: ${F}`);ne=!0,ae.push([F,me,{gpuBuffer:be,download:s.jsepCreateDownloader(be,Qe,F),dispose:()=>{s._OrtReleaseTensor(te)}},"gpu-buffer"])}else{let ye=Ut(F),be=new ye(Ve);new Uint8Array(be.buffer,be.byteOffset,be.byteLength).set(s.HEAPU8.subarray(H,H+be.byteLength)),ae.push([F,me,be,"cpu"])}}finally{s.stackRestore(re),F==="string"&&H&&s._free(H),ne||s._OrtReleaseTensor(te)}}return l&&!p&&(s._OrtClearBoundOutputs(l.handle),Ze.set(e,[u,d,c,l,p,!1])),ae}finally{s.stackRestore(_),g.forEach(z=>s._OrtReleaseTensor(z)),b.forEach(z=>s._OrtReleaseTensor(z)),$.forEach(z=>s._free(z)),y!==0&&s._OrtReleaseRunOptions(y),w.forEach(z=>s._free(z))}},Ot=e=>{let t=se(),n=Ze.get(e);if(!n)throw new Error("invalid session id");let r=n[0],o=t._OrtEndProfiling(r);o===0&&oe("Can't get an profile file name."),t._OrtFree(o)},Bt=e=>{let t=[];for(let n of e){let r=n[2];!Array.isArray(r)&&"buffer"in r&&t.push(r.buffer)}return t}});var Xe,Ce,gt,un,dn,an,tr,nr,et,tt,Sc,Ka,ja,Za,Xa,Qa,Ya,Ja,rr=A(()=>{"use strict";Se();wn();Le();rt();Xe=()=>!!X.wasm.proxy&&typeof document<"u",gt=!1,un=!1,dn=!1,nr=new Map,et=(e,t)=>{let n=nr.get(e);n?n.push(t):nr.set(e,[t])},tt=()=>{if(gt||!un||dn||!Ce)throw new Error("worker not ready")},Sc=e=>{switch(e.data.type){case"init-wasm":gt=!1,e.data.err?(dn=!0,tr[1](e.data.err)):(un=!0,tr[0]()),an&&(URL.revokeObjectURL(an),an=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=nr.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}default:}},Ka=async()=>{if(!un){if(gt)throw new Error("multiple calls to 'initWasm()' detected.");if(dn)throw new Error("previous call to 'initWasm()' failed.");if(gt=!0,Xe())return new Promise((e,t)=>{Ce?.terminate(),Gr().then(([n,r])=>{try{Ce=r,Ce.onerror=i=>t(i),Ce.onmessage=Sc,tr=[e,t];let o={type:"init-wasm",in:X};Ce.postMessage(o),an=n}catch(o){t(o)}},t)});try{await Tt(X.wasm),await At(X),un=!0}catch(e){throw dn=!0,e}finally{gt=!1}}},ja=async e=>{if(Xe())return tt(),new Promise((t,n)=>{et("init-ep",[t,n]);let r={type:"init-ep",in:{epName:e,env:X}};Ce.postMessage(r)});await kt(X,e)},Za=async e=>Xe()?(tt(),new Promise((t,n)=>{et("copy-from",[t,n]);let r={type:"copy-from",in:{buffer:e}};Ce.postMessage(r,[e.buffer])})):ot(e),Xa=async(e,t)=>{if(Xe()){if(t?.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return tt(),new Promise((n,r)=>{et("create",[n,r]);let o={type:"create",in:{model:e,options:{...t}}},i=[];e instanceof Uint8Array&&i.push(e.buffer),Ce.postMessage(o,i)})}else return Et(e,t)},Qa=async e=>{if(Xe())return tt(),new Promise((t,n)=>{et("release",[t,n]);let r={type:"release",in:e};Ce.postMessage(r)});Pt(e)},Ya=async(e,t,n,r,o,i)=>{if(Xe()){if(n.some(s=>s[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(o.some(s=>s))throw new Error("pre-allocated output tensor is not supported for proxy.");return tt(),new Promise((s,a)=>{et("run",[s,a]);let u=n,d={type:"run",in:{sessionId:e,inputIndices:t,inputs:u,outputIndices:r,options:i}};Ce.postMessage(d,Bt(u))})}else return zt(e,t,n,r,o,i)},Ja=async e=>{if(Xe())return tt(),new Promise((t,n)=>{et("end-profiling",[t,n]);let r={type:"end-profiling",in:e};Ce.postMessage(r)});Ot(e)}});var eu,Ic,ln,tu=A(()=>{"use strict";Se();rr();R();Ct();Sn();eu=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},Ic=e=>{switch(e[3]){case"cpu":return new ce(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!Mt(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:n,download:r,dispose:o}=e[2];return ce.fromGpuBuffer(n,{dataType:t,dims:e[1],download:r,dispose:o})}default:throw new Error(`invalid data location: ${e[3]}`)}},ln=class{async fetchModelAndCopyToWasmMemory(t){return Za(await ut(t))}async loadModel(t,n){$e();let r;typeof t=="string"?!1?r=await ut(t):r=await this.fetchModelAndCopyToWasmMemory(t):r=t,[this.sessionId,this.inputNames,this.outputNames]=await Xa(r,n),fe()}async dispose(){return Qa(this.sessionId)}async run(t,n,r){$e();let o=[],i=[];Object.entries(t).forEach(p=>{let f=p[0],m=p[1],h=this.inputNames.indexOf(f);if(h===-1)throw new Error(`invalid input '${f}'`);o.push(m),i.push(h)});let s=[],a=[];Object.entries(n).forEach(p=>{let f=p[0],m=p[1],h=this.outputNames.indexOf(f);if(h===-1)throw new Error(`invalid output '${f}'`);s.push(m),a.push(h)});let u=o.map((p,f)=>eu(p,()=>`input "${this.inputNames[i[f]]}"`)),d=s.map((p,f)=>p?eu(p,()=>`output "${this.outputNames[a[f]]}"`):null),c=await Ya(this.sessionId,i,u,a,d,r),l={};for(let p=0;p<c.length;p++)l[this.outputNames[a[p]]]=s[p]??Ic(c[p]);return fe(),l}startProfiling(){}endProfiling(){Ja(this.sessionId)}}});var Cc,cn,nu=A(()=>{"use strict";Se();rr();tu();rt();Cc=()=>{if((typeof X.wasm.initTimeout!="number"||X.wasm.initTimeout<0)&&(X.wasm.initTimeout=0),X.wasm.simd===!1&&console.warn('Deprecated property "env.wasm.simd" is set to false. non-SIMD build is no longer provided, and this setting will be ignored.'),typeof X.wasm.proxy!="boolean"&&(X.wasm.proxy=!1),typeof X.wasm.trace!="boolean"&&(X.wasm.trace=!1),typeof X.wasm.numThreads!="number"||!Number.isInteger(X.wasm.numThreads)||X.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)X.wasm.numThreads=1;else{let e=typeof navigator>"u"?mn("node:os").cpus().length:navigator.hardwareConcurrency;X.wasm.numThreads=Math.min(4,Math.ceil((e||1)/2))}X.wasm.wasmPaths===void 0&&Ie&&Ie.indexOf("blob:")!==0&&(X.wasm.wasmPaths=Ie.substring(0,Ie.lastIndexOf("/")+1))},cn=class{async init(t){Cc(),await Ka(),await ja(t)}async createInferenceSessionHandler(t,n){let r=new ln;return await r.loadModel(t,n),Promise.resolve(r)}}});var ru={};yt(ru,{wasmBackend:()=>Tc});var Tc,ou=A(()=>{"use strict";nu();Tc=new cn});Se();Se();Se();var Br="1.20.0-dev.20240827-1d059b8702";var p_=bn;{let e=(ou(),fn(ru)).wasmBackend;We("webgpu",e,5),We("webnn",e,5),We("cpu",e,10),We("wasm",e,10)}Object.defineProperty(X.versions,"web",{value:Br,enumerable:!0});export{cu as InferenceSession,xt as TRACE,$e as TRACE_FUNC_BEGIN,fe as TRACE_FUNC_END,ce as Tensor,mu as TrainingSession,p_ as default,X as env,We as registerBackend};
/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
//# sourceMappingURL=ort.webgpu.min.mjs.map
