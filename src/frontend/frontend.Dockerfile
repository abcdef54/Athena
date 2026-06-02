FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY ./src/frontend /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/html/src && \
    ln -s /usr/share/nginx/html /usr/share/nginx/html/src/frontend

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]