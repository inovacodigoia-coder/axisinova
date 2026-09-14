# Correção do cálculo da Bilirrubina Indireta

## Objetivo
Fazer a BILI calcular automaticamente `BILT - BILD`, seguindo o mesmo comportamento visual e funcional do COLF.

## Alterações
- Exibir BILT e BILD como variáveis azuis reconhecidas no editor da fórmula da BILI.
- Resolver valores somente entre exames do mesmo pedido/paciente, evitando cruzamento entre atendimentos.
- Considerar valores já salvos e valores recém-digitados de BILT e BILD.
- Manter o resultado calculado da BILI disponível para salvar e emitir no laudo.

## Validação
- Testar a fórmula com Bilirrubina Total e Direta preenchidas.
- Confirmar que a Indireta exibe a subtração correta e acompanha alterações dos dois valores.
- Executar os testes relacionados ao avaliador de fórmulas.

## Detalhes técnicos
- Ampliar o editor de parâmetros para reconhecer códigos de outros exames citados na fórmula.
- Tornar a resolução de tokens externos dependente do identificador do pedido.
- Criar cobertura para fórmulas com chaves e códigos, como `{BILT} - {BILD}`.
