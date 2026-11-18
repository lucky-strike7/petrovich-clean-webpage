import { execFileSync } from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain')){
  console.error('Есть незакоммиченные изменения. Сначала сохраните их в своей ветке; обновление ничего не перезаписало.');process.exit(1);
}
if(git('branch','--show-current')!=='main'){
  console.error('Обновляйте main: git switch main, затем npm run update. Рабочую ветку объединяйте с main отдельно.');process.exit(1);
}
execFileSync('git',['pull','--ff-only','origin','main'],{stdio:'inherit'});
console.log('Готово. После изменения package-lock.json выполните npm ci. Для нового релиза: npm run check, npm test, npm run build.');
