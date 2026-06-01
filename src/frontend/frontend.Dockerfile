FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY ./src/frontend /usr/share/nginx/html/src/frontend

RUN ln -s /usr/share/nginx/html/src/frontend/index.html /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]