import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
mkdirSync('reports',{recursive:true});
const tests=readdirSync('tests').filter(name=>name.endsWith('.test.mjs')&&name!=='e2e.test.mjs').map(name=>'tests/'+name);
const result=spawnSync(process.execPath,[
 '--import','./tests/support/register.mjs','--enable-source-maps','--experimental-test-coverage',
 '--test-coverage-lines=100','--test-coverage-branches=100','--test-coverage-functions=100',
 ...['lib/linkedin/*.ts','app/**/*.ts','app/**/*.tsx','db/*.ts'].map(glob=>'--test-coverage-include='+glob),
 '--test-reporter=spec','--test-reporter-destination=stdout',
 '--test-reporter=lcov','--test-reporter-destination=reports/coverage.lcov',
 '--test-reporter=./tests/support/coverage-reporter.mjs','--test-reporter-destination=reports/coverage.json',
 '--test',...tests
],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
const summary=JSON.parse(readFileSync('reports/coverage.json','utf8'));
const covered=new Set(summary.files.map(file=>path.relative(process.cwd(),file.path)));
const inventory=['app','db','lib/linkedin'].flatMap(dir=>readdirSync(dir,{recursive:true}).filter(file=>/\.(ts|tsx)$/.test(file)).map(file=>path.join(dir,file)));
for(const file of inventory)if(!covered.has(file))throw new Error('Production file absent from coverage: '+file);
for(const file of summary.files)for(const kind of ['Line','Branch','Function'])if(file['covered'+kind+'Count']!==file['total'+kind+'Count'])throw new Error('Incomplete '+kind+' coverage: '+file.path);
console.log('Coverage gate: every application file has 100% lines, branches, and functions.');
