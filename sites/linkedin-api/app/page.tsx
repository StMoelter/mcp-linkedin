import {getChatGPTUser,chatGPTSignInPath} from './chatgpt-auth';
import {configured,createHandler} from '@/lib/linkedin/core';
import {configuration} from '@/lib/linkedin/runtime';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<{result?:string}>}) {
  const user=await getChatGPTUser();
  const config=configuration();
  const ready=configured(config);
  const result=(await searchParams).result;
  const messages:Record<string,string>={connected:'LinkedIn wurde verbunden.',disconnected:'Die gespeicherte Verbindung wurde entfernt.',declined:'Die LinkedIn-Verbindung wurde abgebrochen.'};
  let status:{connected?:boolean;name?:string;requires_reconnect?:boolean;error?:string}={};
  if(user && ready) {
    const response=await createHandler(config)(new Request(config.origin+'/api/linkedin/status',{headers:{'oai-authenticated-user-id':user.userId}}));
    status=await response.json();
  }
  return <main>
    <span className="eyebrow">DEINE VERBINDUNG</span><h1>LinkedIn</h1>
    {result && messages[result] && <p role="status" className="notice">{messages[result]}</p>}
    {!user ? <><p>Melde dich mit ChatGPT an, um dein LinkedIn-Konto zu verbinden.</p><a className="button" href={chatGPTSignInPath('/')} target="_top">Mit ChatGPT anmelden</a></> :
      !ready ? <><p>Die LinkedIn-App muss noch eingerichtet werden.</p><p className="muted">Client ID und Client Secret werden serverseitig hinterlegt. Danach kannst du dein eigenes Konto verbinden.</p><div className="callback"><span>Rückleitungsadresse für die LinkedIn-App</span><code>{config.origin}/auth/linkedin/callback</code></div></> :
      status.error ? <p role="alert">Die Verbindung konnte nicht geladen werden. Versuche es später erneut.</p> :
      <><p>{status.connected ? <>Verbunden als <strong>{status.name}</strong>.</> : 'Verbinde dein eigenes LinkedIn-Konto.'}</p>
      {status.requires_reconnect && <p className="notice">Deine Anmeldung muss erneuert werden.</p>}
      <form action="/auth/linkedin/start" method="post" target="_top"><button>{status.connected?'LinkedIn erneut verbinden':'LinkedIn verbinden'}</button></form>
      {status.connected && <form action="/auth/linkedin/disconnect" method="post" target="_top"><button className="secondary">Verbindung entfernen</button></form>}
      <p className="muted">Deine Verbindung gehört ausschließlich zu deinem ChatGPT-Konto. Beiträge kannst du anschließend über das Plugin veröffentlichen.</p></>}
  </main>;
}
