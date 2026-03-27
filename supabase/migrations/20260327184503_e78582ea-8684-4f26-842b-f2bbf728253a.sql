
CREATE OR REPLACE FUNCTION public.resolve_exercise_id(_name text, _muscle_group text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _id uuid;
BEGIN
  SELECT id INTO _id FROM public.exercises WHERE name = _name AND muscle_group = _muscle_group LIMIT 1;
  IF _id IS NOT NULL THEN
    RETURN _id;
  END IF;
  
  INSERT INTO public.exercises (name, muscle_group) VALUES (_name, _muscle_group)
  RETURNING id INTO _id;
  
  RETURN _id;
END;
$$;
