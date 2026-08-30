FROM node:20-alpine


RUN apk add --no-cache git

WORKDIR /app


COPY package.json ./
COPY src/ ./src/
COPY test/fixtures/ ./test/fixtures/


ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000


CMD ["npm", "start"]
