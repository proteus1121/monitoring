#!/bin/sh

# Генерация приватного ключа RSA
openssl genpkey -algorithm RSA -out private-key.pem -pkeyopt rsa_keygen_bits:4096
if [ $? -ne 0 ]; then
  echo "Ошибка при генерации приватного ключа"
  exit 1
fi

# Создание самоподписанного сертификата
openssl req -x509 -new -key private-key.pem -out certificate.pem -days 365 -subj "/CN=localhost"
if [ $? -ne 0 ]; then
  echo "Ошибка при создании сертификата"
  exit 1
fi

# Просмотр содержимого сертификата
openssl x509 -in certificate.pem -text -noout
if [ $? -ne 0 ]; then
  echo "Ошибка при отображении сертификата"
  exit 1
fi

echo "Все команды выполнены успешно, после генерации один раз надо перейти на урл https://localhost:4000 и нажать continue to unsafe"
