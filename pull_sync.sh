#!/bin/bash

set -u

LOCAL_PATH="."

mkdir -p "${LOCAL_PATH}/webapp/node/"
rsync -avr isu1:~/webapp/node/ "${LOCAL_PATH}/webapp/node/"
mkdir -p "${LOCAL_PATH}/webapp/sql/"
rsync -avr isu1:~/webapp/sql/ "${LOCAL_PATH}/webapp/sql/"

mkdir -p "${LOCAL_PATH}/nginx/isu1/"
rsync -avr --exclude='' isu1:/etc/nginx/ "${LOCAL_PATH}/nginx/isu1/"
mkdir -p "${LOCAL_PATH}/nginx/isu2/"
rsync -avr --exclude='' isu2:/etc/nginx/ "${LOCAL_PATH}/nginx/isu2/"
#rsync -avr --exclude='' isu3:/etc/nginx/ "${LOCAL_PATH}/nginx/isu3/"
mkdir -p "${LOCAL_PATH}/mysql/isu1/"
rsync -avr --exclude='' isu1:/etc/mysql/ "${LOCAL_PATH}/mysql/isu1"
mkdir -p "${LOCAL_PATH}/mysql/isu2/"
rsync -avr --exclude='' isu2:/etc/mysql/ "${LOCAL_PATH}/mysql/isu2"
#rsync -avr --exclude='' isu3:/etc/mysql/ "${LOCAL_PATH}/mysql/isu3"
  
