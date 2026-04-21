import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Briefcase, CalendarDays, BarChart3, ExternalLink, MapPin, Loader2, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useCity } from '@/hooks/useCity';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MunicipalProfile {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
}

interface MLink { id: string; title: string; icon_url: string | null; link_url: string; }
interface MService { id: string; title: string; description: string | null; icon: string; link_url: string | null; image_url: string | null; }
interface MEvent { id: string; title: string; description: string | null; event_date: string; end_date: string | null; location: string | null; image_url: string | null; link_url: string | null; }
interface MPoll { id: string; title: string; description: string | null; image_url: string | null; options: { id: string; option_text: string; }[]; vote_counts: Record<string, number>; total_votes: number; }

export default function PublicUtilityPage() {
  const { selectedCity } = useCity();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<MunicipalProfile | null>(null);
  const [links, setLinks] = useState<MLink[]>([]);
  const [services, setServices] = useState<MService[]>([]);
  const [events, setEvents] = useState<MEvent[]>([]);
  const [polls, setPolls] = useState<MPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<MEvent | null>(null);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [votingPoll, setVotingPoll] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("links");

  useEffect(() => {
    if (selectedCity) {
      fetchData();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [selectedCity, user]);

  const fetchData = async () => {
    setLoading(true);

    // Get municipal profile for this city
    const { data: profileData } = await supabase
      .from('municipal_profiles' as any)
      .select('*')
      .eq('city_id', selectedCity!.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!profileData) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const mp = profileData as unknown as MunicipalProfile;
    setProfile(mp);

    // Fetch all data in parallel
    const [linksRes, servicesRes, eventsRes, pollsRes] = await Promise.all([
      supabase.from('municipal_links' as any).select('*').eq('municipal_profile_id', mp.id).eq('is_active', true).order('display_order'),
      supabase.from('municipal_services' as any).select('*').eq('municipal_profile_id', mp.id).eq('is_active', true).order('display_order'),
      supabase.from('municipal_events' as any).select('*').eq('municipal_profile_id', mp.id).eq('is_active', true).order('event_date'),
      supabase.from('municipal_polls' as any).select('*').eq('municipal_profile_id', mp.id).eq('is_active', true),
    ]);

    setLinks((linksRes.data as unknown as MLink[]) || []);
    setServices((servicesRes.data as unknown as MService[]) || []);
    setEvents((eventsRes.data as unknown as MEvent[]) || []);

    // Fetch poll options and votes
    const pollsList = (pollsRes.data as unknown as MPoll[]) || [];
    const userVoted = new Set<string>();

    for (const poll of pollsList) {
      const { data: opts } = await supabase
        .from('municipal_poll_options' as any)
        .select('*')
        .eq('poll_id', poll.id)
        .order('display_order');
      poll.options = (opts as any[]) || [];

      const { data: counts } = await supabase.rpc('get_poll_vote_counts', { p_poll_id: poll.id });
      const voteCounts: Record<string, number> = {};
      let total = 0;
      ((counts as any[]) || []).forEach((c: any) => {
        voteCounts[c.option_id] = Number(c.vote_count);
        total += Number(c.vote_count);
      });
      poll.vote_counts = voteCounts;
      poll.total_votes = total;

      // Check if user already voted
      if (user) {
        const { data: vote } = await supabase
          .from('municipal_poll_votes' as any)
          .select('id')
          .eq('poll_id', poll.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (vote) userVoted.add(poll.id);
      }
    }

    setPolls(pollsList);
    setVotedPolls(userVoted);
    setLoading(false);
  };

  const refreshPollData = async (pollId: string) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    const { data: counts } = await supabase.rpc('get_poll_vote_counts', { p_poll_id: pollId });
    const voteCounts: Record<string, number> = {};
    let total = 0;
    ((counts as any[]) || []).forEach((c: any) => {
      voteCounts[c.option_id] = Number(c.vote_count);
      total += Number(c.vote_count);
    });

    setPolls(prev => prev.map(p =>
      p.id === pollId ? { ...p, vote_counts: voteCounts, total_votes: total } : p
    ));
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      toast({ title: 'Faça login para votar', variant: 'destructive' });
      return;
    }
    setVotingPoll(pollId);

    const { error } = await supabase
      .from('municipal_poll_votes' as any)
      .insert({ poll_id: pollId, option_id: optionId, user_id: user.id });

    if (error) {
      toast({ title: error.message.includes('unique') ? 'Você já votou nesta enquete' : 'Erro ao votar', variant: 'destructive' });
    } else {
      toast({ title: 'Voto registrado!' });
      setVotedPolls(prev => new Set(prev).add(pollId));
      await refreshPollData(pollId);
    }
    setVotingPoll(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-28 pb-12">
        {!selectedCity ? (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Selecione uma cidade</h2>
            <p className="text-muted-foreground">Escolha uma cidade na barra de navegação para ver as informações da prefeitura.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : !profile ? (
          <div className="text-center py-20">
            <Landmark className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Utilidade Pública</h2>
            <p className="text-muted-foreground">A prefeitura de {selectedCity.name} ainda não cadastrou informações.</p>
          </div>
        ) : (
          <>
            {/* Hero Section with Cover + Logo */}
            <div className="rounded-2xl overflow-hidden mb-8 border border-border">
              <div className="relative">
                {profile.cover_url ? (
                  <img src={profile.cover_url} alt="" className="w-full h-48 sm:h-64 object-cover" />
                ) : (
                  <div className="w-full h-48 sm:h-64 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
                )}
                {/* Logo overlay */}
                {profile.logo_url && (
                  <img
                    src={profile.logo_url}
                    alt={profile.name}
                    className="absolute -bottom-10 left-6 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-background shadow-lg"
                  />
                )}
              </div>
              <div className={`px-6 pb-5 ${profile.logo_url ? 'pt-12 sm:pt-14' : 'pt-5'}`}>
                <h1 className="text-2xl sm:text-3xl font-bold">{profile.name}</h1>
                {profile.description && <p className="text-muted-foreground mt-1">{profile.description}</p>}
                <Badge variant="outline" className="mt-2">
                  <MapPin className="w-3 h-3 mr-1" />
                  {selectedCity.name}, {selectedCity.state}
                </Badge>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 mb-6 p-1">
                <TabsTrigger value="links" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <Link2 className="w-4 h-4 flex-shrink-0" />
                  <span>Tudo na Mão</span>
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <Briefcase className="w-4 h-4 flex-shrink-0" />
                  <span>Serviços</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <CalendarDays className="w-4 h-4 flex-shrink-0" />
                  <span>Agenda</span>
                </TabsTrigger>
                <TabsTrigger value="polls" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span>Enquetes</span>
                </TabsTrigger>
              </TabsList>

              {/* Tudo na Mão */}
              <TabsContent value="links">
                {links.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum link disponível.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {links.map((link, i) => (
                      <motion.a
                        key={link.id}
                        href={link.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-xl p-4 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors text-center group"
                      >
                        {link.icon_url ? (
                          <img src={link.icon_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <ExternalLink className="w-8 h-8 text-primary" />
                        )}
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">{link.title}</span>
                      </motion.a>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Serviços */}
              <TabsContent value="services">
                {services.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum serviço disponível.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-xl overflow-hidden"
                      >
                        {s.image_url && (
                          <img src={s.image_url} alt={s.title} className="w-full h-40 object-cover" />
                        )}
                        <div className="p-5 space-y-3">
                          <h3 className="font-semibold text-lg">{s.title}</h3>
                          {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                          {s.link_url && (
                            <a href={s.link_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-3 h-3 mr-1" />Acessar
                              </Button>
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Agenda */}
              <TabsContent value="events">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum evento agendado.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {events.map((e, i) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-xl overflow-hidden flex flex-col"
                      >
                        {e.image_url && (
                          <img src={e.image_url} alt={e.title} className="w-full h-32 object-cover" />
                        )}
                        <div className="p-5 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{e.title}</h3>
                              <p className="text-sm text-primary font-medium">
                                {format(new Date(e.event_date), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              {e.location && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />{e.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" onClick={() => setSelectedEvent(e)}>
                              Saiba mais
                            </Button>
                            {e.link_url && (
                              <a href={e.link_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm"><ExternalLink className="w-3 h-3 mr-1" />Link</Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Enquetes */}
              <TabsContent value="polls">
                {polls.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma enquete ativa.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {polls.map((poll) => {
                      const hasVoted = votedPolls.has(poll.id);
                      return (
                        <motion.div
                          key={poll.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass rounded-xl overflow-hidden"
                        >
                          {poll.image_url && (
                            <img src={poll.image_url} alt={poll.title} className="w-full h-44 object-cover" />
                          )}
                          <div className="p-5 space-y-4">
                          <div>
                            <h3 className="font-semibold text-lg">{poll.title}</h3>
                            {poll.description && <p className="text-sm text-muted-foreground">{poll.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1">{poll.total_votes} votos</p>
                          </div>

                          <div className="space-y-2">
                            {poll.options.map((opt) => {
                              const count = poll.vote_counts[opt.id] || 0;
                              const pct = poll.total_votes ? Math.round((count / poll.total_votes) * 100) : 0;

                              if (hasVoted || !user) {
                                return (
                                  <div key={opt.id} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span>{opt.option_text}</span>
                                      <span className="text-muted-foreground">{pct}%</span>
                                    </div>
                                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <Button
                                  key={opt.id}
                                  variant="outline"
                                  className="w-full justify-start"
                                  disabled={votingPoll === poll.id}
                                  onClick={() => handleVote(poll.id, opt.id)}
                                >
                                  {opt.option_text}
                                </Button>
                              );
                            })}
                          </div>

                          {!user && (
                            <p className="text-xs text-muted-foreground">Faça login para votar.</p>
                          )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.image_url && (
                <img src={selectedEvent.image_url} alt="" className="w-full h-48 object-cover rounded-lg" />
              )}
              <p className="text-sm text-primary font-medium">
                {format(new Date(selectedEvent.event_date), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              {selectedEvent.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{selectedEvent.location}
                </p>
              )}
              {selectedEvent.description && <p className="text-sm">{selectedEvent.description}</p>}
              {selectedEvent.link_url && (
                <a href={selectedEvent.link_url} target="_blank" rel="noopener noreferrer">
                  <Button><ExternalLink className="w-4 h-4 mr-2" />Acessar Link</Button>
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
