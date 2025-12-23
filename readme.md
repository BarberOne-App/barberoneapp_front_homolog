# 🧔 AdDev Barbearia – SGA

O **AdDev Barbearia (SGA_Barbearia)** é um sistema de gestão para barbearias desenvolvido em **React**, com foco em controle de agendamentos, serviços e clientes.

## 🔗 Repositório

- GitHub: [https://github.com/addevconsultoria/SGA_Barbearia.git](https://github.com/addevconsultoria/SGA_Barbearia.git)

## 🚀 Tecnologias utilizadas

- **React.js** – Biblioteca principal para construção da interface.
- **JSON Server** – Simulação de uma API REST para uso local com dados mockados. 
- **Node.js & npm** – Gerenciamento de pacotes e execução do ambiente de desenvolvimento.

## 📦 Pré-requisitos

Antes de começar, você precisa ter instalado em sua máquina:

- **Node.js** (versão recomendada: 16+).
- **npm** (já incluído na instalação do Node.js).

## 🛠 Instalação

Clone este repositório:

git clone https://github.com/addevconsultoria/SGA_Barbearia.git



Acesse a pasta do projeto:

cd SGA_Barbearia



Instale as dependências:

npm install



## 💻 Como rodar o projeto localmente

1. Inicie o servidor fake (JSON Server) com a base mockada:

npx json-server --watch db.json --port 3000



2. Em outro terminal, execute o projeto React:

npm run dev



3. Acesse o projeto no navegador:

http://localhost:5173



## 🧱 Arquitetura e estado atual

- **Frontend** em React consumindo uma **estrutura mockada** via JSON Server (arquivo `db.json`).
- **Backend real** e **banco de dados** ainda serão implementados em fases futuras, substituindo o mock atual.
- A arquitetura está sendo pensada para facilitar a futura integração com uma API REST real e um SGBD relacional ou não relacional.


## 👨‍💻 Autores

Desenvolvido por:

- **Abilton**
- **Lucas**
- **Rodolpho**