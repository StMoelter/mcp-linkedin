import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
mkdirSync('reports',{recursive:true});
for(const args of [
 ['scripts/run-framework.mjs','build'],
 ['--test','--test-reporter=spec','--test-reporter-destination=stdout','--test-reporter=junit','--test-reporter-destination=reports/e2e.xml','tests/e2e.test.mjs']
]){
 const result=spawnSync(process.execPath,args,{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
