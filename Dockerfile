# Stage 1: Build State
FROM node:18-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production State (ใช้ Nginx เพื่อ serve ไฟล์)
FROM nginx:alpine as production-stage

# Copy ไฟล์ที่ Build แล้วจาก Stage 1 มาใส่ใน Nginx
# หมายเหตุ: ถ้าใช้ Vite โฟลเดอร์จะเป็น /dist ถ้าใช้ Create-React-App (CRA) จะเป็น /build
# ให้แก้บรรทัดด้านล่างให้ตรงกับโปรเจกต์ของคุณ (ตัวอย่างนี้ใช้ dist)
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy nginx config ที่เราสร้างไว้
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]