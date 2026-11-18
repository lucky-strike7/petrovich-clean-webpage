import test from 'node:test';
import assert from 'node:assert/strict';
import {checkShareMetadata} from '../scripts/check-share-metadata.mjs';
const page='<meta property="og:title" content="Project"><meta property="og:type" content="article"><meta property="og:image" content="https://petrovichbrothers.ru/project.jpg"><meta property="og:url" content="https://petrovichbrothers.ru/cases/project/">';
test('a new case without the optional image description can still be published',()=>{
 const warnings=[];assert.doesNotThrow(()=>checkShareMetadata(page,'cases/project/index.html',message=>warnings.push(message)));assert.equal(warnings.length,1);assert.match(warnings[0],/recommended og:image:alt/);
});
test('missing essential share metadata still fails validation',()=>{
 assert.throws(()=>checkShareMetadata(page.replace('property="og:image"','property="other"'),'case.html',()=>{}),/Missing og:image/);
 const warnings=[];checkShareMetadata(page+'<meta property="og:image:alt" content="Image">','case.html',message=>warnings.push(message));assert.equal(warnings.length,0);
});
