#!/bin/bash

set -u

LOCAL_PATH="."

rsync -avr --exclude='node_modules' "${LOCAL_PATH}/webapp/node/" isu1:~/webapp/node/ 
rsync -vr "${LOCAL_PATH}/webapp/sql/" isu1:~/webapp/sql/
ssh isu1 sudo systemctl restart isupipe-node.service
#rsync -vr --exclude='node_modules' "${LOCAL_PATH}/isucari/webapp/nodejs/" isu2:~/isucari/webapp/nodejs/ 
#ssh isu2 sudo systemctl restart isucari.nodejs.service
#rsync -avr --exclude='node_modules' "${LOCAL_PATH}/isucari/webapp/nodejs/" isu3:~/isucari/webapp/nodejs/ 
#ssh isu3 sudo systemctl restart isucari.nodejs.service
#rsync -vr --exclude='initial.sql' "${LOCAL_PATH}/isucari/webapp/sql/" isu2:~/isucari/webapp/sql/
#rsync -vr --exclude='initial.sql' "${LOCAL_PATH}/isucari/webapp/sql/" isu3:~/isucari/webapp/sql/

#rsync -vr --exclude='' "${LOCAL_PATH}/nginx/isu1/" isu1:/etc/nginx/
#rsync -vr --exclude='' "${LOCAL_PATH}/nginx/isu2/" isu2:/etc/nginx/
#rsync -vr --exclude='' "${LOCAL_PATH}/nginx/isu3/" isu3:/etc/nginx/
#rsync -vr --exclude='' "${LOCAL_PATH}/mysql/isu1/" isu1:/etc/mysql/
#rsync -vr --exclude='' "${LOCAL_PATH}/mysql/isu2/" isu2:/etc/mysql/
#rsync -vr --exclude='' "${LOCAL_PATH}/mysql/isu3/" isu3:/etc/mysql/
  
