const {spawn}=require('node:child_process');const {sync,watch}=require('./sync-shop-config.cjs');
sync();const watcher=watch();const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack',...process.argv.slice(2)],{stdio:'inherit'});
child.on('exit',code=>{watcher.close();process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{watcher.close();child.kill(signal);});
