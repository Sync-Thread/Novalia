
do $$begin create type org_type_enum            as enum ('agency','agent','seller_individual','notary','platform_admin'); exception when duplicate_object then null; end$$;
do $$begin create type property_status_enum     as enum ('draft','published','archived');                               exception when duplicate_object then null; end$$;
do $$begin create type property_type_enum       as enum ('house','apartment','land','office','commercial','industrial','other'); exception when duplicate_object then null; end$$;
do $$begin create type operation_type_enum      as enum ('sale','rent');                                                exception when duplicate_object then null; end$$;
do $$begin create type media_type_enum          as enum ('image','video','document');                                   exception when duplicate_object then null; end$$;
do $$begin create type verification_status_enum as enum ('pending','verified','rejected');                              exception when duplicate_object then null; end$$;
do $$begin create type doc_type_enum            as enum ('deed','no_predial_debt','ine','rpp_certificate','plan','other'); exception when duplicate_object then null; end$$;
do $$begin create type event_type_enum          as enum ('page_view','property_click','share','open_outbound','chat_open','first_contact','chat_message'); exception when duplicate_object then null; end$$;
do $$begin create type contract_type_enum       as enum ('intermediacion','oferta','promesa');                          exception when duplicate_object then null; end$$;
do $$begin create type contract_status_enum     as enum ('draft','sent','signed','cancelled','expired');                exception when duplicate_object then null; end$$;
do $$begin create type invoice_status_enum      as enum ('pending','issued','cancelled','paid','failed');               exception when duplicate_object then null; end$$;
do $$begin create type sender_type_enum         as enum ('user','contact','system');                                    exception when duplicate_object then null; end$$;
do $$begin create type currency_enum            as enum ('MXN','USD');                                                  exception when duplicate_object then null; end$$;
do $$begin create type channel_enum             as enum ('email','sms','whatsapp','push','webhook');                    exception when duplicate_object then null; end$$;
do $$begin create type message_status_enum      as enum ('queued','sent','delivered','failed','bounced');               exception when duplicate_object then null; end$$;
do $$begin create type payment_method_enum      as enum ('card','spei','split_notary');                                 exception when duplicate_object then null; end$$;
do $$begin create type payment_status_enum      as enum ('initiated','confirmed','failed','refunded');                  exception when duplicate_object then null; end$$;
