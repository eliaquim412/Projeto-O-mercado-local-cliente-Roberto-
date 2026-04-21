-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, customer_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Customers can view their conversations"
ON public.conversations FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Store owners can view their conversations"
ON public.conversations FOR SELECT
USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.owner_id = auth.uid()));

CREATE POLICY "Customers can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.owner_id = auth.uid()));

-- RLS policies for messages
CREATE POLICY "Conversation participants can view messages"
ON public.messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = messages.conversation_id 
  AND (conversations.customer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.owner_id = auth.uid()
  ))
));

CREATE POLICY "Conversation participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.customer_id = auth.uid() OR EXISTS (
      SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.owner_id = auth.uid()
    ))
  )
);

CREATE POLICY "Participants can update messages"
ON public.messages FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = messages.conversation_id 
  AND (conversations.customer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.owner_id = auth.uid()
  ))
));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_conversations_store_id ON public.conversations(store_id);
CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();