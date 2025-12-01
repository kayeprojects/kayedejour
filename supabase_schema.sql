-- Create a table for user profiles (optional, but good practice)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Create a table for folders
create table folders (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update notes table to include user_id
alter table notes add column user_id uuid references auth.users;

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table folders enable row level security;
-- notes table already has RLS enabled

-- Profiles policies
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- Folders policies
create policy "Users can view their own folders." on folders for select using ( auth.uid() = user_id );
create policy "Users can insert their own folders." on folders for insert with check ( auth.uid() = user_id );
create policy "Users can update their own folders." on folders for update using ( auth.uid() = user_id );
create policy "Users can delete their own folders." on folders for delete using ( auth.uid() = user_id );

-- Notes policies (Update existing ones to be user-specific)
drop policy "Enable read access for all users" on notes;
drop policy "Enable insert access for all users" on notes;
drop policy "Enable update access for all users" on notes;
drop policy "Enable delete access for all users" on notes;

create policy "Users can view their own notes." on notes for select using ( auth.uid() = user_id );
create policy "Users can insert their own notes." on notes for insert with check ( auth.uid() = user_id );
create policy "Users can update their own notes." on notes for update using ( auth.uid() = user_id );
create policy "Users can delete their own notes." on notes for delete using ( auth.uid() = user_id );

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create default folders
  insert into public.folders (user_id, name) values (new.id, 'Lyrics');
  insert into public.folders (user_id, name) values (new.id, 'Dreams');
  insert into public.folders (user_id, name) values (new.id, 'Dark Thoughts');
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
