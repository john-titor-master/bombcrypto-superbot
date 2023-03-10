## Instalação

execute o seguinte codigo

```
sudo apt-get install unzip
wget --no-cache -O -  https://raw.githubusercontent.com/lucasvieceli/bombcrypto-superbot/master/install.sh | bash
```

## Atualizar o bot

execute o seguinte codigo

```
yarn start
```

## Ver logs

```
ACTION=LOGS yarn start
```

para ver de uma conta especifica

```
ACTION=LOGS IDENTIFY=... yarn start
```

para ver somente os erros

```
ACTION=LOGS TYPE=err yarn start
```

## Add conta

```
ACTION=CREATE_ACCOUNT SERIAL=... LOGIN=... IDENTIFY=... etc yarn start
```

## Pausar todas as contas

```
ACTION=DELETE_ALL yarn start
```

## Removar uma conta do banco de dados

```
ACTION=REMOVE_ACCOUNT IDENTIFY=... yarn start
```

## Editar uma conta do banco de dados

para editar alguma informação passe ACTION IDENTIFY e a coluna que você quer editar, vamos dizer que você deseja editar LOGIN

```
ACTION=UPDATE_ACCOUNT IDENTIFY=... LOGIN=... yarn start
```

## Converter arquivo ecosystem.config.js para o novo padrao de criar conta

coloque o arquivo ecosystem.config.js no mesmo diatorio do arquivo do bot

execute

```
ACTION=CONVERT yarn start
```

Vamos dizer que seu arquivo ecosystem seja assim

```
module.exports = {
    apps: [
        {
            name: "client1",
            instances: "1",
            exec_mode: "fork",
            script: "npm run start:bot",
            env: {
                DEBUG_LEVEL: "info",
                MIN_HERO_ENERGY_PERCENTAGE: "50",
                LOGIN: "user:CHANGE:CHANGE",
                TELEGRAM_KEY: "CHANGE",
                NETWORK: "POLYGON",
                ALERT_SHIELD: 50,
                NUM_HERO_WORK: 5,
                TELEGRAM_CHAT_ID: "CHANGE",
            },
        },
    ],
};

```

cada conta ira sair um resultado igual abaixo:

```
ACTION=CREATE_ACCOUNT MIN_HERO_ENERGY_PERCENTAGE=50 IDENTIFY=client1 LOGIN=user:CHANGE:CHANGE TELEGRAM_KEY=CHANGE NETWORK=POLYGON ALERT_SHIELD=50 NUM_HERO_WORK=5 TELEGRAM_CHAT_ID=CHANGE yarn start
```

entao você copia essa saida e adicione o serial ficando assim:

```
ACTION=CREATE_ACCOUNT SERIAL=... MIN_HERO_ENERGY_PERCENTAGE=50 IDENTIFY=client1 LOGIN=user:CHANGE:CHANGE TELEGRAM_KEY=CHANGE NETWORK=POLYGON ALERT_SHIELD=50 NUM_HERO_WORK=5 TELEGRAM_CHAT_ID=CHANGE yarn start
```

faça isso para cada conta

## Variáveis

As variáveis são:

| Nome da variável           | Obrigatório | Descrição                                                                                                                                                                                                                                                                                                                                          | Exemplo                                               |
| -------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| LOGIN                      | Sim         | dados usário para login, se for login com usuário e senha, deve ser utilizado "user:", se for com a wallet "wallet:"                                                                                                                                                                                                                               | user:NOMEUSUARIO:SENHA ou wallet:WALLETID:PRIVATE_KEY |
| TELEGRAM_KEY               | Não         | Chave do bot telegram, para você conseguir acionar comandos via telegram bot                                                                                                                                                                                                                                                                       |                                                       |
| NETWORK                    | Não         | A rede que será conectada, valores são BSC ou POLYGON, o padrão é BSC                                                                                                                                                                                                                                                                              | POLYGON                                               |
| MIN_HERO_ENERGY_PERCENTAGE | Não         | A porcentagem que o hero irá começar a trabalhar, você deve informar sem o símbulo %,o padrão é 50%                                                                                                                                                                                                                                                | 50                                                    |
| HOUSE_HEROES               | Não         | Caso você tenha casa, você pode informar quais heros terão preferencia na casa, o valor deve ser separado com :                                                                                                                                                                                                                                    | 312312312:12323123:2323232                            |
| ALERT_SHIELD               | Não         | Caso você tenha informado TELEGRAM_KEY e TELEGRAM_CHAT_ID, você pode ser notificado quando o shield do hero estiver acabando, aqui você informa quanto de shield vc quer que seja notificado                                                                                                                                                       | 100                                                   |
| NUM_HERO_WORK              | Não         | A quantidade de heroes que irão trabalhar ao mesmo tempo o padrão é 15                                                                                                                                                                                                                                                                             | 5                                                     |
| SERVER                     | Não         | o servidor que será conectado valores existentes, "na", "sea", "sa", valor padrão se não for informado sea                                                                                                                                                                                                                                         | sea                                                   |
| TELEGRAM_CHAT_ID_CHECK     | Não         | Caso seja informado com o valor 1 e tamém seja informado o telegram chat id, a pessoa que náo é dona do telegram bot, não irá conseguir acionar os comandos do telegram                                                                                                                                                                            | 1                                                     |
| REPORT_REWARDS             | Não         | caso seja informado, e também seja informado TELEGRAM_CHAT_ID, o bot irá enviar os rewards automaticamente para o chat, o valor é em minutos, exemplo 30 é 30 minutos, 120, é duas horas                                                                                                                                                           | 30                                                    |
| TELEGRAM_CHAT_ID           | Não         | chat id do telegram para funcionar as notificações                                                                                                                                                                                                                                                                                                 |                                                       |
| MAX_GAS_REPAIR_SHIELD      | Não         | Valor máximo que pode ser gasto para reparar o shield                                                                                                                                                                                                                                                                                              | 0.004                                                 |
| ALERT_MATERIAL             | Não         | Somente quando for logado com wallet, alerta quando chegar o material no valor informado                                                                                                                                                                                                                                                           | 5                                                     |
| RESET_SHIELD_AUTO          | Não         | Somente quando for logado com wallet, irá da reset automaticamente quando chegar a zero                                                                                                                                                                                                                                                            | 1                                                     |
| IDENTIFY                   | Não         | Identificador da sua conta                                                                                                                                                                                                                                                                                                                         |
| IGNORE_NUM_HERO_WORK       | Não         | Caso seja informado essa config, e ja tem a quantidade de heroes trabalhando conforme a configuração NUM_HERO_WORK, quando algum hero chegar a 100% de vida, ele irá colocar para trabalhar mesmo assim                                                                                                                                            | 1                                                     |
| IGNORE_REWARD_CURRENCY     | Não         | [Clique aqui para ver mais detalhes ](#sobre-ignore_reward_currency)                                                                                                                                                                                                                                                                               |                                                       |
| REWARDS_ALL_PERMISSION     | Não         | Lista das contas(que foi inforamdo no parametro IDENTIFY) que essa conta pode ver no comando /rewards_all, exemplo: você cadastrou 3 contas no bot e colocou em cada conta um IDENTIFY(CONFIGURAÇÃO), uma é "lucas" outra "lucas1" e "paulo" e você quer que essa conta veja a lucas e lucas1 então informe REWARDS_ALL_PERMISSION: "lucas:lucas1" | lucas:lucas1                                          |
| WORK_HERO_WITH_SHIELD      | Não         | Coloca o hero pra trabalhar quando tiver com o shield igual ou abaixo do valor informado e a energia estiver supeior a 50                                                                                                                                                                                                                          | 30                                                    |
| IGNORE_COMMAND             |             |

## Comandos telegram

| Nome               | Descrição                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| /rewards           | Retorna todas as moedas que você já minerou                                                                       |
| /stats             | Retorna o status dos heroes                                                                                       |
| /exit              | Da stop no bot                                                                                                    |
| /start             | Da start no bot                                                                                                   |
| /shield            | Retorna os dados dos shields                                                                                      |
| /rewards_all       | Retorna todos os rewards das contas, o rewards é atualizado sempre q começa um novo mapa ou a conta for conectada |
| /start_calc_farm   | Comando para iniciar o calculo do farm por hora                                                                   |
| /stop_calc_farm    | Comando para da stop no calculo do farm por hora e mostra os resultados                                           |
| /current_calc_farm | Mostra o relatório atual do cáculo de farm, mas não da stop                                                       |
| /gas_polygon       | Retona quanto custaria uma transação na polygon no momento                                                        |
| /withdraw          | Faz o claim caso tenha mais de 40 bombs                                                                           |
| /wallet            | Mostra o saldo da sua carteira                                                                                    |
| /reset_shield      | Restaura shield do hero                                                                                           |
| /deactivate_hero   | Desativar um hero                                                                                                 |
| /activate_hero     | Ativar um hero                                                                                                    |
| /pool              | Retorna o valor que tem no bomb rewards pool                                                                      |
| /add_account       |                                                                                                                   |
| /remove_account    |                                                                                                                   |
| /change_config     |                                                                                                                   |

## Sobre IGNORE_REWARD_CURRENCY

Hoje quando você rodar o comando /rewards será apresentado algo como isso:

```
Account:

Rewards:
TR-Unknown: 0
TR-COIN: 212.18
BSC-BCoin: 1.25
BSC-Bomberman: 0
BSC-Key: 0
BSC-BCoin Deposited: 0
BSC-Senspark: 0
BSC-MSPc: 0
BSC-WOFM: 6.58
BSC-NFT PVP: 1
```

Caso você queira que não apareça alguma dessas moedas, você pode usar a configuração IGNORE_REWARD_CURRENCY para ignorar elas e não serem apresentadas. Vamos dizer que eu queira ignorar 3 moedas: BSC-Senspark, BSC-MSPc e BSC-WOFM

Basta você colocar o nome dessas moedas entre elas com o caracter :

segue exemplo

```
IGNORE_REWARD_CURRENCY="Senspark:MSPc:WOFM"
```

precisa ser exatamente igual o nome, e o resultado será:

```
Account:

Rewards:
TR-Unknown: 0
TR-COIN: 212.18
BSC-BCoin: 1.25
BSC-Bomberman: 0
BSC-Key: 0
BSC-BCoin Deposited: 0
BSC-NFT PVP: 1
```
