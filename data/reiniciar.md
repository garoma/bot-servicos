1. Parar o PM2
pm2 stop bot-servicos
pm2 delete bot-servicos
pm2 save

Se o nome no PM2 for outro:

pm2 list
2. Ir para a home
cd /home/garoma
3. Apagar a pasta antiga

⚠️ Cuidado para apagar a pasta correta.

rm -rf /home/garoma/bot-servicos
4. Clonar do zero
git clone https://github.com/garoma/bot-servicos.git
5. Entrar na pasta
cd bot-servicos
6. Instalar dependências
npm install

Se usar Puppeteer / Chromium, talvez precise depois instalar libs do sistema.

7. Subir no PM2
pm2 start index.js --name bot-servicos
8. Salvar inicialização automática
pm2 save
pm2 startup

Ele vai mostrar um comando extra. Execute o comando que aparecer.

✅ Ver logs
pm2 logs bot-servicos
✅ Se precisar QR Code

Como está em VPS Linux, normalmente o QR não aparece bonito. Use:

pm2 logs bot-servicos

e veja se imprime o QR no terminal/log.

Se não, rode temporariamente fora do PM2:

node index.js

Escaneie o QR, depois pare e volte pro PM2.

✅ MUITO IMPORTANTE: arquivos JSON locais

Se você usa:

data/services.json
storage/leads.json
storage/ratings.json

e eles não estão no GitHub, após clonar talvez venham vazios ou nem existam.

Crie:

mkdir -p data storage
touch data/services.json
touch storage/leads.json
touch storage/ratings.json

E coloque conteúdo mínimo:

services.json
{}
leads.json
[]
ratings.json
[]