#!/bin/bash

set -euo pipefail

function check_user_exists {
    local user=$1

    jq -e --arg username "$user" 'any(.[]; .username == $username)' >/dev/null <<< "$users"
    return $?
}

function find_current_super_admin {
    local user

    user=$(jq -r 'index(.[] | select(.isSuperAdmin == true)) as $i | .[$i].username' <<< "$users")
    echo "$user"
}

function update_super_admin_state {
    local user=$1
    local state=$2
    local new_users

    # Always sets "isAdmin: true" as super admins MUST be admins as well.
    # Demoted super admins are kept as admins.
    new_users=$(jq --arg username "$user" \
      --argjson state "$state" \
      '(.[] | select(.username == $username)) |= (.isSuperAdmin = $state | .isAdmin = true)' <<< "$users")
    echo "$new_users"
}

if [[ "$#" -ne 2 ]]; then
  echo "Usage: $0 <new_super_admin> <path_to_users.json>"
  echo "Updates the super admin user in the system to the specified user."
  echo "Demotes the current super admin to a regular admin."
  echo "Provide the path to the users.json file: <data_dir>/users/users.json"
  exit 1
fi

if ! which jq >/dev/null 2>&1; then
    echo "'jq' must be installed."
    exit 1
fi

new_super_admin=$1
users_json_path=$2

if [[ ! -w "$users_json_path" ]]; then
    echo "${users_json_path} does not exist or is not writable by the current user."
    exit 1
fi

users=$(<"$users_json_path")

if ! check_user_exists "$new_super_admin"; then
    echo "The user ${new_super_admin} does not exist."
    exit 1
fi

current_super_admin=$(find_current_super_admin)

if [[ "${current_super_admin}" == "" ]]; then
    echo "No existing super admin found. Aborting."
    exit 1
fi

echo "Current super admin is: ${current_super_admin}"

if [[ "${current_super_admin}" == "${new_super_admin}" ]]; then
    echo "The target user is already the super admin. Done."
    exit 0
fi

echo "Demoting..."
users=$(update_super_admin_state "$current_super_admin" "false")

echo "Promoting new super admin: ${new_super_admin}"
users=$(update_super_admin_state "$new_super_admin" "true")

echo "Backing up existing users.json to: ${users_json_path}.bak"
cp "${users_json_path}" "${users_json_path}.bak"
echo "Updating ${users_json_path}."
printf "%s" "$users" > "$users_json_path"

echo "Done. Remove ${users_json_path}.bak after verifying result."
