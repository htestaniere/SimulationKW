#!/bin/bash
# optimisation de c AVEC la dynamique des vérins, avec / sans vectoring (un job par (vitesse, vectoring, N))
cd "$(dirname "$0")"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
run(){ v=$1; vec=$2; n=$3; f=logs_verin/vec${vec}_V${v}_N${n}.txt
 "$C" --headless --disable-gpu --user-data-dir=/tmp/chr_ver_${vec}_${v}_${n} --enable-logging=stderr --v=0 --virtual-time-budget=100000000 --dump-dom "file://$PWD/opt_vec.html#V=${v},vec=${vec},verin=1,N=${n}-${n}" > $f 2>&1; }
export -f run; export C
for n in 10 9 8 7 6 5 4 3; do for v in 10 20 30 40; do for vec in 0 1; do echo "$v $vec $n"; done; done; done | xargs -P 10 -L1 bash -c 'run $0 $1 $2'
echo FINI > logs_verin/FINI
