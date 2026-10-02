#!/usr/bin/env bash
# Usage: check.sh name1 name2 ...   (names without TLD)
rdap() {
  local url="$1"
  curl -s --max-time 8 "$url" | grep -q ldhName && echo "taken" || echo "free?"
}
printf "%-20s %-7s %-7s\n" name com app
for n in "$@"; do
  c=$(rdap "https://rdap.verisign.com/com/v1/domain/$n.com")
  a=$(rdap "https://pubapi.registry.google/rdap/domain/$n.app")
  printf "%-20s %-7s %-7s\n" "$n" "$c" "$a"
done
