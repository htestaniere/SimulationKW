#!/bin/bash
# lance l'optimisation de c avec / sans vectoring (jobs parallèles, un navigateur par job)
cd "$(dirname "$0")"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
run(){ v=$1; vec=$2; rg=$3; f=logs_vec/vec${vec}_V${v}_N${rg}.txt
 "$C" --headless --disable-gpu --user-data-dir=/tmp/chr_vec_${vec}_${v}_${rg} --enable-logging=stderr --v=0 --virtual-time-budget=100000000 --dump-dom "file://$PWD/opt_vec.html#V=${v},vec=${vec},N=${rg/-/-}" > $f 2>&1; }
export -f run; export C
for vec in 0 1; do for v in 10 20 30 40; do for rg in 3-5 6-8 9-10; do echo "$v $vec $rg"; done; done; done | xargs -P 10 -L1 bash -c 'run $0 $1 $2'
echo FINI > logs_vec/FINI
