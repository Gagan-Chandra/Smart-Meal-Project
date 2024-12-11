#!/usr/bin/env bash
set -e

host="$1"
shift
cmd="$@"

until nc -z "$host"; do
  >&2 echo "Service is unavailable - waiting..."
  sleep 1
done

>&2 echo "Service is up - executing command"
exec $cmd
