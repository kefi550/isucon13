#!/bin/bash

set -eu

hosts=($(echo isu{1..3}))
rows=""

for host in ${hosts[@]}; do
  private_ip=$(ssh $host curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
  rows+="$private_ip $host"$'\n'
done

for host in ${hosts[@]}; do
  ssh $host "echo \"$rows\" | sudo tee -a /etc/hosts"
done
