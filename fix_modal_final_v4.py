import sys

file_path = 'src/components/reception/attendance/lookup/AttendanceDetailsModal.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Vamos procurar o final e substituir
marker = '      {clientModalMode && ('
end_of_client_modal = content.find(marker)
if end_of_client_modal != -1:
    # Procurar o fim do bloco clientModalMode
    closing_bracket = content.find('      )}', end_of_client_modal)
    if closing_bracket != -1:
        prefix = content[:closing_bracket + 8]
        # Pegar o que vem depois (PaymentCard)
        payment_card_start = content.find('function PaymentCard', closing_bracket)
        if payment_card_start != -1:
            suffix = content[payment_card_start:]
            
            new_content = prefix + '\n      </ScrollArea>\n    </DialogContent>\n  </Dialog>\n  );\n}\n\n' + suffix
            with open(file_path, 'w') as f:
                f.write(new_content)
            print("Sucesso")
        else:
            print("PaymentCard não encontrado")
    else:
        print("Fechamento do clientModalMode não encontrado")
else:
    print("Marker não encontrado")

