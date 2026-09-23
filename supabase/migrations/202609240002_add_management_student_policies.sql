-- Policy to allow management to insert new profiles (for teachers, students, parents)
create policy "management inserts profiles" on public.profiles 
  for insert 
  with check (public.is_management());

-- Policy to allow management to delete profiles if needed
create policy "management deletes profiles" on public.profiles 
  for delete 
  using (public.is_management());

-- Policy to allow management to delete students
create policy "management deletes students" on public.students 
  for delete 
  using (public.is_management());
