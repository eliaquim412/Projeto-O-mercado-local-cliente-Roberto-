import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const TermsOfUsePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-32 pb-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-2">Termos de Uso</h1>
            <p className="text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ao acessar e utilizar a plataforma O Mercado Local, você concorda com estes Termos de Uso. 
                  Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
                <p className="text-muted-foreground leading-relaxed">
                  O Mercado Local é uma plataforma de marketplace que conecta compradores e vendedores locais. 
                  Atuamos como intermediários, facilitando a divulgação de produtos e a comunicação entre as partes. 
                  Não somos responsáveis pela qualidade, segurança ou legalidade dos produtos anunciados.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Cadastro de Usuários</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Para utilizar nossos serviços, você deve:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Ter pelo menos 18 anos de idade ou ser emancipado;</li>
                  <li>Fornecer informações verdadeiras, completas e atualizadas;</li>
                  <li>Manter a confidencialidade da sua senha;</li>
                  <li>Ser responsável por todas as atividades realizadas em sua conta.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Obrigações dos Vendedores</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Os vendedores se comprometem a:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Anunciar apenas produtos que possuam legalmente;</li>
                  <li>Fornecer descrições precisas e fotos reais dos produtos;</li>
                  <li>Cumprir com as obrigações fiscais e tributárias;</li>
                  <li>Respeitar o Código de Defesa do Consumidor;</li>
                  <li>Responder às mensagens dos compradores em tempo hábil;</li>
                  <li>Não anunciar produtos proibidos ou ilegais.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Obrigações dos Compradores</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Os compradores se comprometem a:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Utilizar a plataforma de boa-fé;</li>
                  <li>Honrar as negociações acordadas com vendedores;</li>
                  <li>Não utilizar informações de vendedores para fins não autorizados;</li>
                  <li>Reportar produtos ou comportamentos suspeitos.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Produtos Proibidos</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  É expressamente proibido anunciar:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Drogas ilícitas e medicamentos controlados;</li>
                  <li>Armas de fogo e munições;</li>
                  <li>Produtos falsificados ou piratas;</li>
                  <li>Animais silvestres;</li>
                  <li>Produtos roubados ou de origem ilícita;</li>
                  <li>Conteúdo pornográfico ou que explore menores;</li>
                  <li>Qualquer item cuja venda seja proibida por lei.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Responsabilidades</h2>
                <p className="text-muted-foreground leading-relaxed">
                  O Mercado Local não se responsabiliza por: transações realizadas fora da plataforma; 
                  qualidade ou entrega dos produtos; disputas entre compradores e vendedores; 
                  danos decorrentes do uso ou impossibilidade de uso da plataforma. A plataforma 
                  atua apenas como facilitadora, cabendo às partes resolver eventuais conflitos.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Propriedade Intelectual</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Todo o conteúdo da plataforma (marca, logo, design, textos, imagens) é de propriedade 
                  exclusiva de O Mercado Local ou de seus parceiros. É proibida a reprodução, modificação 
                  ou distribuição sem autorização prévia.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Suspensão e Cancelamento</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Reservamo-nos o direito de suspender ou cancelar contas que violem estes Termos de Uso, 
                  sem aviso prévio. Usuários suspensos não poderão criar novas contas.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Alterações nos Termos</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Podemos modificar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor 
                  após publicação na plataforma. O uso continuado após as alterações implica aceitação dos novos termos.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Lei Aplicável</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
                  Qualquer disputa será submetida ao foro da comarca de domicílio do usuário.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">12. Contato</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para dúvidas sobre estes Termos de Uso, entre em contato pelo e-mail:{" "}
                  <a href="mailto:contato@omercadolocal.com.br" className="text-primary hover:underline">
                    contato@omercadolocal.com.br
                  </a>
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsOfUsePage;
