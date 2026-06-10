import paramiko
import sys
import os

# Forcar o stdout e stderr a usarem UTF-8 para evitar erros de charmap no terminal Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

ip = "177.153.39.134"
username = "root"
passwords = ["lXde@12#45", "IXde@12#45"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connected = False
active_password = None

for pwd in passwords:
    try:
        print(f"Tentando conectar com a senha: {pwd}...")
        client.connect(ip, username=username, password=pwd, timeout=10)
        print("Conectado com sucesso!")
        connected = True
        active_password = pwd
        break
    except paramiko.AuthenticationException:
        print(f"Falha de autenticacao com a senha: {pwd}")
    except Exception as e:
        print(f"Erro inesperado ao conectar: {e}")
        sys.exit(1)

if not connected:
    print("Nao foi possivel autenticar com nenhuma das senhas fornecidas.")
    sys.exit(1)

output_file_path = r"C:\Users\BOSS\.gemini\antigravity-ide\brain\ef80b836-1d6c-4c0c-b6d0-607cbf5b098b\vps_diagnosis.md"
markdown_content = []

markdown_content.append("# Relatório de Diagnóstico da VPS - RelmDesk\n")
markdown_content.append(f"- **IP da VPS:** `{ip}`\n")
markdown_content.append(f"- **Usuário:** `{username}`\n")
markdown_content.append(f"- **Senha Utilizada:** `{active_password}`\n")
markdown_content.append("\n---\n")

def run_cmd(title, cmd):
    print(f"Executando: {cmd}...")
    markdown_content.append(f"## {title}\n")
    markdown_content.append(f"**Comando executado:** `{cmd}`\n\n")
    try:
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        
        if out:
            markdown_content.append("### Saída (STDOUT)\n")
            markdown_content.append("```text\n" + out + "\n```\n\n")
        if err:
            markdown_content.append("### Erros (STDERR)\n")
            markdown_content.append("```text\n" + err + "\n```\n\n")
        if not out and not err:
            markdown_content.append("*Nenhuma saída retornada.*\n\n")
    except Exception as e:
        markdown_content.append(f"❌ **Erro ao executar comando:** {e}\n\n")

# Coletando informações
run_cmd("Informações do Sistema Operacional", "uname -a")
run_cmd("Uso de Memória", "free -h")
run_cmd("Espaço em Disco", "df -h /")
run_cmd("Status Geral do PM2", "pm2 status")
run_cmd("Detalhes do Processo Backend (PM2)", "pm2 show relmdesk-backend")
run_cmd("Detalhes do Processo Frontend (PM2)", "pm2 show relmdesk-frontend")
run_cmd("Status do Serviço PostgreSQL", "systemctl status postgresql")
run_cmd("Variáveis de Ambiente do Backend (.env)", "cat /home/ubuntu/HelmDesk/backend/.env")
run_cmd("Variáveis de Ambiente do Frontend (.env)", "cat /home/ubuntu/HelmDesk/frontend/.env")
run_cmd("Status do Repositório Git", "git -C /home/ubuntu/HelmDesk status")
run_cmd("Último Commit Aplicado na VPS", "git -C /home/ubuntu/HelmDesk log -1")
run_cmd("Resumo dos Registros do Banco de Dados", 'sudo -u postgres psql -d relmdesk -c "SELECT \'users\' as tabela, count(*) as total from users UNION SELECT \'tickets\', count(*) from tickets UNION SELECT \'stores\', count(*) from stores UNION SELECT \'brands\', count(*) from brands UNION SELECT \'departments\', count(*) from departments ORDER BY total DESC;"')
run_cmd("Logs Recentes do Backend (PM2)", "pm2 logs relmdesk-backend --lines 25 --nostream")
run_cmd("Logs Recentes do Frontend (PM2)", "pm2 logs relmdesk-frontend --lines 25 --nostream")

# Gravar o arquivo Markdown
try:
    with open(output_file_path, "w", encoding="utf-8") as f:
        f.writelines(markdown_content)
    print(f"\nRelatório gravado com sucesso em: {output_file_path}")
except Exception as e:
    print(f"Erro ao salvar arquivo: {e}")

client.close()
