#!/bin/sh
# fccview here! This is just a quick script the Dockerfile uses to set up permissions for the container.
# You don't need to use it, nor worry about it, feel free to ignore it while developing.

set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}
UMASK=${UMASK:-002}

if [ "$(id -u)" = "0" ]; then
    if [ "$PUID" != "1000" ] || [ "$PGID" != "1000" ]; then
        GROUP_NAME=$(getent group "$PGID" | cut -d: -f1)
        if [ -z "$GROUP_NAME" ]; then
            addgroup -g "$PGID" appgroup
            GROUP_NAME="appgroup"
        fi
        
        if ! getent passwd "$PUID" > /dev/null 2>&1; then
            adduser -D -u "$PUID" -G "$GROUP_NAME" appuser
        fi
        
        chown -R "$PUID:$PGID" /app/data /app/.next /app/config 2>/dev/null || true
    fi
    
    umask "$UMASK"
    
    USER_NAME=$(getent passwd "$PUID" | cut -d: -f1)
    GROUP_NAME=$(getent group "$PGID" | cut -d: -f1)
    exec su-exec "$USER_NAME:$GROUP_NAME" "$@"
else
    umask "$UMASK"
    exec "$@"
fi

