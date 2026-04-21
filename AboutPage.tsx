import { motion } from "framer-motion";
import { Users, Target, Heart, Shield, MapPin, Store } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const AboutPage = () => {
  const values = [
    {
      icon: Heart,
      title: "Comunidade Local",
      description: "Fortalecemos o comércio da sua cidade, conectando você aos melhores vendedores da região.",
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Transações seguras e vendedores verificados para sua tranquilidade nas compras.",
    },
    {
      icon: Users,
      title: "Conexão Humana",
      description: "Acreditamos no poder das relações entre pessoas e negócios locais.",
    },
    {
      icon: Target,
      title: "Simplicidade",
      description: "Plataforma intuitiva que facilita a compra e venda de produtos de forma rápida.",
    },
  ];

  const stats = [
    { value: "1000+", label: "Lojas Cadastradas" },
    { value: "50+", label: "Cidades Atendidas" },
    { value: "10k+", label: "Produtos Disponíveis" },
    { value: "99%", label: "Clientes Satisfeitos" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Sobre <span className="text-primary">O Mercado Local</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Somos a plataforma que conecta você aos melhores produtos e lojas da sua cidade, 
              fortalecendo o comércio local e facilitando suas compras.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">Nossa Missão</h2>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Nascemos com o propósito de revolucionar a forma como as pessoas compram e vendem 
                em suas cidades. Queremos ser a ponte entre consumidores e comerciantes locais, 
                promovendo uma economia mais forte e sustentável para todos.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">Nossa Visão</h2>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Ser a maior plataforma de marketplace local do Brasil, presente em todas as 
                cidades e reconhecida por transformar positivamente o comércio regional, 
                gerando oportunidades para empreendedores e comodidade para consumidores.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossos Valores</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Os princípios que guiam cada decisão e ação da nossa plataforma
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-2xl p-6 text-center hover:border-primary/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Faça Parte da Nossa Comunidade</h2>
            <p className="text-muted-foreground mb-8">
              Seja você um comprador em busca das melhores ofertas ou um vendedor querendo 
              expandir seu negócio, O Mercado Local é o lugar certo para você.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/busca" 
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Explorar Produtos
              </a>
              <a 
                href="/auth" 
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-border font-medium hover:bg-muted transition-colors"
              >
                Criar Minha Loja
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
