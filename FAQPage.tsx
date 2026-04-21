import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const FAQPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqCategories = [
    {
      category: "Compradores",
      questions: [
        {
          question: "Como faço para comprar um produto?",
          answer: "Navegue pelos produtos disponíveis, selecione o item desejado e clique em 'Comprar via WhatsApp'. Você será direcionado para uma conversa com o vendedor onde poderá combinar os detalhes da compra, forma de pagamento e entrega.",
        },
        {
          question: "É seguro comprar pela plataforma?",
          answer: "Trabalhamos para verificar os vendedores cadastrados e oferecemos um sistema de avaliações para que você possa ver a reputação de cada loja. Recomendamos sempre verificar as avaliações antes de comprar e preferir encontros em locais públicos para retirada de produtos.",
        },
        {
          question: "Quais são as formas de pagamento aceitas?",
          answer: "As formas de pagamento são combinadas diretamente com cada vendedor. Geralmente são aceitos PIX, dinheiro, cartão de débito/crédito e transferência bancária. Confirme com o vendedor antes de finalizar a compra.",
        },
        {
          question: "Como funciona a entrega dos produtos?",
          answer: "A entrega é combinada diretamente com o vendedor. Pode ser feita por retirada no local, entrega pelo próprio vendedor ou envio pelos Correios/transportadora. Os custos de frete, quando aplicáveis, são informados pelo vendedor.",
        },
        {
          question: "E se o produto vier com defeito?",
          answer: "De acordo com o Código de Defesa do Consumidor, você tem direito à troca ou devolução em caso de defeito. Entre em contato diretamente com o vendedor para resolver a situação. Se não houver acordo, você pode nos reportar o problema.",
        },
        {
          question: "Como posso favoritar produtos?",
          answer: "Ao passar o mouse sobre um produto, clique no ícone de coração para adicionar aos favoritos. Você precisa estar logado para usar esta funcionalidade. Acesse seus favoritos pelo menu do usuário.",
        },
      ],
    },
    {
      category: "Vendedores",
      questions: [
        {
          question: "Como cadastrar minha loja?",
          answer: "Crie uma conta selecionando a opção 'Sou Vendedor' no cadastro. Após confirmar seu e-mail, acesse o painel do vendedor para completar as informações da sua loja: nome, descrição, logo, endereço e WhatsApp para contato.",
        },
        {
          question: "Quanto custa anunciar na plataforma?",
          answer: "O cadastro e anúncio de produtos é gratuito! Não cobramos taxas sobre as vendas realizadas. Futuramente poderemos oferecer planos premium com recursos adicionais.",
        },
        {
          question: "Como adicionar produtos à minha loja?",
          answer: "No painel do vendedor, acesse 'Produtos' e clique em 'Adicionar Produto'. Preencha as informações como nome, descrição, preço, fotos e categoria. Produtos com fotos de qualidade e descrições detalhadas vendem mais!",
        },
        {
          question: "Posso destacar meus produtos?",
          answer: "Sim! No painel do vendedor, você pode marcar produtos como 'Destaque' para que apareçam com maior visibilidade na página inicial e nas buscas.",
        },
        {
          question: "Como recebo os pagamentos?",
          answer: "Os pagamentos são feitos diretamente pelo comprador a você, sem intermediação da plataforma. Combine com o cliente a melhor forma de pagamento (PIX, dinheiro, cartão, etc.).",
        },
        {
          question: "Como criar cupons de desconto?",
          answer: "No painel do vendedor, acesse 'Cupons' para criar códigos promocionais. Você pode definir o tipo de desconto (percentual ou valor fixo), validade, limite de usos e valor mínimo de compra.",
        },
      ],
    },
    {
      category: "Conta e Cadastro",
      questions: [
        {
          question: "Como criar uma conta?",
          answer: "Clique em 'Entrar' no menu superior e depois em 'Criar conta'. Preencha seus dados, escolha se você é comprador ou vendedor, e confirme seu e-mail para ativar a conta.",
        },
        {
          question: "Esqueci minha senha, o que fazer?",
          answer: "Na página de login, clique em 'Esqueci minha senha'. Digite seu e-mail cadastrado e você receberá um link para criar uma nova senha.",
        },
        {
          question: "Como alterar meus dados cadastrais?",
          answer: "Acesse seu perfil clicando no ícone de usuário no menu superior. Lá você pode atualizar nome, telefone, endereço e outras informações.",
        },
        {
          question: "Posso ter conta de comprador e vendedor?",
          answer: "Sim! Com uma única conta você pode comprar produtos de outras lojas e também ter sua própria loja para vender. Basta cadastrar sua loja no painel do vendedor.",
        },
        {
          question: "Como excluir minha conta?",
          answer: "Para excluir sua conta, entre em contato conosco pelo e-mail contato@omercadolocal.com.br. Lembre-se que ao excluir a conta, todos os seus dados, pedidos e anúncios serão permanentemente removidos.",
        },
      ],
    },
    {
      category: "Geral",
      questions: [
        {
          question: "O Mercado Local está disponível em quais cidades?",
          answer: "Estamos em constante expansão! Atualmente atendemos diversas cidades brasileiras. Ao acessar a plataforma, selecione sua cidade para ver os produtos e lojas disponíveis na sua região.",
        },
        {
          question: "Como funciona o sistema de avaliações?",
          answer: "Após realizar uma compra, você pode avaliar o produto e a loja com uma nota de 1 a 5 estrelas e deixar um comentário. As avaliações ajudam outros compradores e incentivam os vendedores a manterem a qualidade.",
        },
        {
          question: "Como denunciar um anúncio irregular?",
          answer: "Se encontrar um produto proibido, com informações falsas ou suspeito de fraude, clique em 'Denunciar' na página do produto ou entre em contato conosco. Analisaremos e tomaremos as medidas necessárias.",
        },
        {
          question: "A plataforma tem aplicativo?",
          answer: "Atualmente funcionamos como uma plataforma web responsiva, que funciona perfeitamente em celulares, tablets e computadores. Você pode adicionar o site à tela inicial do seu celular para acesso rápido.",
        },
        {
          question: "Como entro em contato com o suporte?",
          answer: "Você pode nos contatar pelo e-mail contato@omercadolocal.com.br. Nossa equipe responde em até 48 horas úteis.",
        },
      ],
    },
  ];

  const filteredCategories = faqCategories.map((category) => ({
    ...category,
    questions: category.questions.filter(
      (q) =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-32 pb-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold mb-4">Perguntas Frequentes</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Encontre respostas para as dúvidas mais comuns sobre a plataforma
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar pergunta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </motion.div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {filteredCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              >
                <h2 className="text-2xl font-semibold mb-4 text-primary">
                  {category.category}
                </h2>
                <div className="glass rounded-xl overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.category}-${index}`}
                        className="border-b border-border last:border-0"
                      >
                        <AccordionTrigger className="px-6 py-4 text-left hover:no-underline hover:bg-muted/50">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4 text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </motion.div>
            ))}

            {filteredCategories.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-muted-foreground">
                  Nenhuma pergunta encontrada para "{searchQuery}"
                </p>
              </motion.div>
            )}
          </div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center glass rounded-xl p-8"
          >
            <h3 className="text-xl font-semibold mb-2">Não encontrou sua resposta?</h3>
            <p className="text-muted-foreground mb-4">
              Entre em contato conosco e teremos prazer em ajudar
            </p>
            <a
              href="mailto:contato@omercadolocal.com.br"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Enviar E-mail
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FAQPage;
