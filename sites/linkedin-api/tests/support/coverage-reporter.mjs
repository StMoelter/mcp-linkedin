export default async function* report(events){
 for await(const event of events)if(event.type==='test:coverage')yield JSON.stringify(event.data.summary,null,2)+'\n';
}
