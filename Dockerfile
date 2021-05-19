########################################################
# STAGE BASE
########################################################
FROM node:12.14.1-stretch-slim as base

ARG TINI_VERSION=v0.19.0

LABEL maintainer="Carlos Remuzzi cremuzzi@agetic.gob.bo"
LABEL org.label-schema.description="Backend del sistema de plantillas de AGETIC"
LABEL org.label-schema.name="plantillas-backend"
LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.vcs-ref=$GITLAB_SHA
LABEL org.label-schema.vcs-url="https://gitlab.softwarelibre.gob.bo/agetic/plantillas/plantillas-backend"
LABEL org.label-schema.vendor="AGETIC"

ENV BACKEND_PUERTO=8000 \
    CITE_DIGITOS=5 \
    CITE_GUIA=ENTIDAD \
    CORREO_HOST=localhost \
    CORREO_IGNORETLS=false \
    CORREO_ORIGEN=ejemplo@correo.gob.bo \
    CORREO_PUERTO=25 \
    CORREO_REMITENTE=Nombre-del-Remitente \
    CORREO_SECURE=false \
    CORREO_TLS_RECHAZAR=false \
    DB_HOST=plantillas_db \
    DB_NOMBRE=plantillas \
    DB_PASSWORD=plantillas \
    DB_PUERTO=5432 \
    DB_USUARIO=plantillas \
    DOCUMENTO_GET=false \
    HOST_BACKEND=0.0.0.0 \
    HOST_FRONTEND=0.0.0.0 \
    IDENTIFICADOR_DIRECCION_UNIDAD=2 \
    IDENTIFICADOR_DIRECTOR=2 \
    JWT_SECRET=esta-cadena-tiene-que-ser-modificada-en-produccion \
    JWT_SESSION=false \
    JWT_TIEMPO=60 \
    LDAP_BIND_DN=cn=admin,dc=entidad,dc=gob,dc=bo \
    LDAP_BIND_PASSWORD=admin \
    LDAP_SEARCHBASE=ou=usuarios,dc=entidad,dc=gob,dc=bo \
    LDAP_URL=ldaps://ldap.example.abc:1234 \
    NODE_ENV=production \
    NOTIFICACION_CORREO_TOKEN=correo-token \
    NOTIFICACION_CORREO_URL=http://192.168.1.2/correo \
    NOTIFICACION_SMS_TOKEN=sms-token \
    NOTIFICACION_SMS_URL=http://192.168.1.2/sms \
    RUTA_ARCHIVOS_EXTERNOS=./public/externos/ \
    RUTA_DOCUMENTOS=./public/documentos/

ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /usr/local/bin/tini
RUN apt-get update \
    && mkdir -p /usr/share/man/man1 \
    && apt-get install --no-install-recommends -y \
        openjdk-8-jre-headless \
    && npm install -g sequelize-cli \
    && chmod +x /usr/local/bin/tini \
    && mkdir /home/node/app \
    && chown -R node:node /home/node/app
    
EXPOSE 8000

WORKDIR /home/node/app

USER node

COPY --chown=node:node package.json .
COPY --chown=node:node seeder.sh .
COPY --chown=node:node ./parches/ ./parches/

RUN npm i \
    && npm run parchar

########################################################
# STAGE DEV
########################################################
FROM base as dev

ENV NODE_ENV=development
ENV PATH=/home/node/app/node_modules/.bin:$PATH

RUN npm i --only=development \
    && npm i nodemon

COPY --chown=node:node index.js .
CMD ["nodemon", "index.js"]

########################################################
# STAGE SOURCE
########################################################
FROM base as source

COPY --chown=node:node . .

########################################################
# STAGE RUNTIME
########################################################
FROM source as runtime

VOLUME ["/home/node/app/public"]

ENTRYPOINT ["/usr/local/bin/tini","--"]

CMD ["node","index.js"]
