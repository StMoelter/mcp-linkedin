const tools = [
  {name:"connection_check",description:"Returns a fixed successful connection check.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
  {name:"roll_dice",description:"Roll count dice with sides faces. Defaults to one six-sided die.",inputSchema:{type:"object",properties:{count:{type:"integer",minimum:1,maximum:100,default:1},sides:{type:"integer",minimum:2,maximum:1000,default:6}},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:false,openWorldHint:false}}
];
function roll(sides:number){
  const limit=Math.floor(4294967296/sides)*sides;
  const value=new Uint32Array(1);
  do{crypto.getRandomValues(value);}while(value[0]>=limit);
  return value[0]%sides+1;
}
export async function POST(request:Request){
  let message;
  try{message=await request.json();}catch{return Response.json({jsonrpc:"2.0",id:null,error:{code:-32700,message:"Parse error"}},{status:400});}
  if(!message || message.jsonrpc!=="2.0" || typeof message.method!=="string")return Response.json({jsonrpc:"2.0",id:null,error:{code:-32600,message:"Invalid request"}},{status:400});
  if(message.id===undefined)return new Response(null,{status:202});
  const reply=(result:unknown)=>Response.json({jsonrpc:"2.0",id:message.id,result});
  const error=(code:number,text:string)=>Response.json({jsonrpc:"2.0",id:message.id,error:{code,message:text}});
  if(message.method==="initialize")return reply({protocolVersion:"2025-03-26",capabilities:{tools:{}},serverInfo:{name:"connection-dice",version:"1.0.0"}});
  if(message.method==="ping")return reply({});
  if(message.method==="tools/list")return reply({tools});
  if(message.method!=="tools/call")return error(-32601,"Method not found");
  const name=message.params?.name;
  const args=message.params?.arguments??{};
  if(typeof args!=="object" || args===null || Array.isArray(args))return error(-32602,"Arguments must be an object");
  let result;
  if(name==="connection_check"){
    if(Object.keys(args).length)return error(-32602,"connection_check takes no arguments");
    result={success:true,message:"Connection successful"};
  }else if(name==="roll_dice"){
    const {count=1,sides=6}=args;
    if(Object.keys(args).some(k=>!["count","sides"].includes(k)) || !Number.isInteger(count) || count<1 || count>100 || !Number.isInteger(sides) || sides<2 || sides>1000)return error(-32602,"count must be 1–100 and sides 2–1000 integers");
    const rolls=Array.from({length:count},()=>roll(sides));
    result={count,sides,rolls,total:rolls.reduce((a,b)=>a+b,0)};
  }else return error(-32602,"Unknown tool");
  return reply({content:[{type:"text",text:JSON.stringify(result)}],structuredContent:result,isError:false});
}
export function GET(){return new Response(null,{status:405,headers:{Allow:"POST"}});}
