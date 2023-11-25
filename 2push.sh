#!/bin/bash

set -u

LOCAL_PATH="."

rsync -avr --exclude='node_modules' "${LOCAL_PATH}/webapp/node/" isu2:~/webapp/node/ 
rsync -vr "${LOCAL_PATH}/webapp/sql/" isu2:~/webapp/sql/
ssh isu2 sudo logrotate -f /etc/logrotate.conf
ssh isu2 sudo systemctl restart isupipe-node.service
