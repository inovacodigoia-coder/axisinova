import sys

file_path = 'src/components/reception/attendance/lookup/AttendanceDetailsModal.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Localizar o início do return
start_line = -1
for i, line in enumerate(lines):
    if 'return (' in line and i > 400:
        start_line = i
        break

# Localizar o fim do componente
end_line = -1
for i in range(len(lines) - 1, -1, -1):
    if 'function PaymentCard' in lines[i]:
        # Procurar o } antes disso
        for j in range(i-1, -1, -1):
            if lines[j].strip() == '}':
                end_line = j
                break
        break

if start_line != -1 and end_line != -1:
    # Substituir o bloco de return
    new_content = lines[:start_line]
    new_content.append('  return (\n')
    new_content.append('    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>\n')
    new_content.append('      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[95vh] p-0 flex flex-col gap-0 bg-[#F8FAFC] border-none shadow-2xl [&>button]:hidden overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">\n')
    new_content.append('        <ScrollArea className="flex-1 overflow-y-auto overflow-x-hidden">\n')
    
    # Copiar o conteúdo original do return, pulando os tags de abertura antigos
    # e parando antes dos tags de fechamento antigos
    # Vamos procurar o final do trecho do return original
    old_return_end = -1
    for k in range(end_line, start_line, -1):
        if ')' in lines[k] and ';' in lines[k]:
            old_return_end = k
            break
            
    # Pular as linhas de abertura do Dialog e DialogContent originais
    # Elas estão em start_line + 1 e start_line + 2 (ou similar)
    content_start = start_line + 3
    # Se inserimos ScrollArea, precisamos pular até onde o conteúdo real começa
    # No arquivo atual, o conteúdo real começa em 432
    content_start = 431 
    
    # Adicionar o conteúdo original (Header Navigation em diante)
    for k in range(content_start, old_return_end):
        # Evitar duplicar ScrollArea ou Dialog tags lidos do arquivo processado com erro
        if '</ScrollArea>' in lines[k] or '</DialogContent>' in lines[k] or '</Dialog>' in lines[k]:
             continue
        new_content.append(lines[k])
    
    new_content.append('        </ScrollArea>\n')
    new_content.append('      </DialogContent>\n')
    new_content.append('    </Dialog>\n')
    new_content.append('  )\n')
    new_content.append('}\n')
    new_content.extend(lines[end_line+1:])
    
    with open(file_path, 'w') as f:
        f.writelines(new_content)
    print("Sucesso")
else:
    print(f"Falha: start={start_line}, end={end_line}")

