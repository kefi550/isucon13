#!/bin/sh

MYSQL_HOST=isu1

ssh -L 3306:localhost:3306 $MYSQL_HOST -N
