import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ChevronRight, CheckCircle, User, Sparkles, Heart, Users } from 'lucide-react';

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ bio: '', avatar_url: '' });
  const [interests, setInterests] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  const interestOptions = [
    'Tecnología', 'Música', 'Deportes', 'Películas', 'Viajes',
    'Comida', 'Arte', 'Educación', 'Negocios', 'Salud',
    'Gaming', 'Fotografía', 'Moda', 'Ciencia', 'Política'
  ];

  useEffect(() => {
    getUser();
    getOnboardingProgress();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const getOnboardingProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setCurrentStep(data.step_completed);
      if (data.tutorial_completed) {
        navigate('/feed');
      }
    }
  };

  const updateProfileStep = async () => {
    setLoading(true);
    try {
      if (!profile.bio.trim()) {
        alert('Por favor agrega una biografía');
        return;
      }

      await supabase
        .from('profiles')
        .update({ bio: profile.bio })
        .eq('id', user.id);

      await supabase.rpc('complete_profile_step', { p_user_id: user.id });
      await supabase.rpc('update_onboarding_step', { p_user_id: user.id, p_step: 1 });

      setCurrentStep(1);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const updateInterests = async () => {
    setLoading(true);
    try {
      if (selectedInterests.length === 0) {
        alert('Selecciona al menos un interés');
        return;
      }

      await supabase.rpc('add_user_interests', {
        p_user_id: user.id,
        p_interests: selectedInterests
      });

      await supabase.rpc('update_onboarding_step', { p_user_id: user.id, p_step: 2 });
      setCurrentStep(2);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar intereses');
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await supabase.rpc('update_onboarding_step', { p_user_id: user.id, p_step: 5 });
      navigate('/feed');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const Step0_Profile = () => (
    <div className="space-y-6">
      <div className="text-center">
        <User className="w-16 h-16 mx-auto text-twitter-600 mb-4" />
        <h2 className="text-2xl font-bold">Completa tu Perfil</h2>
        <p className="text-gray-600 mt-2">Cuéntanos sobre ti</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <label className="block text-sm font-medium mb-2">Biografía</label>
        <textarea
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          placeholder="Escribe algo sobre ti..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-twitter-600 focus:border-transparent"
          rows="4"
        />
        <p className="text-xs text-gray-500 mt-1">{profile.bio.length}/160</p>
      </div>

      <button
        onClick={updateProfileStep}
        disabled={loading}
        className="w-full bg-twitter-600 text-white py-3 rounded-full font-bold hover:bg-twitter-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? 'Guardando...' : 'Siguiente'} <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  const Step1_Interests = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Sparkles className="w-16 h-16 mx-auto text-twitter-600 mb-4" />
        <h2 className="text-2xl font-bold">Tus Intereses</h2>
        <p className="text-gray-600 mt-2">Selecciona al menos 3 intereses</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {interestOptions.map((interest) => (
          <button
            key={interest}
            onClick={() => {
              setSelectedInterests(prev =>
                prev.includes(interest)
                  ? prev.filter(i => i !== interest)
                  : [...prev, interest]
              );
            }}
            className={`p-3 rounded-lg font-medium transition ${
              selectedInterests.includes(interest)
                ? 'bg-twitter-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {interest}
          </button>
        ))}
      </div>

      <button
        onClick={updateInterests}
        disabled={loading || selectedInterests.length === 0}
        className="w-full bg-twitter-600 text-white py-3 rounded-full font-bold hover:bg-twitter-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? 'Guardando...' : 'Siguiente'} <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  const Step2_Suggested = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="w-16 h-16 mx-auto text-twitter-600 mb-4" />
        <h2 className="text-2xl font-bold">Sigue Usuarios</h2>
        <p className="text-gray-600 mt-2">Descubre perfiles interesantes</p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          Puedes saltarte este paso y seguir usuarios después en Explorar.
        </p>
      </div>

      <button
        onClick={completeOnboarding}
        className="w-full bg-twitter-600 text-white py-3 rounded-full font-bold hover:bg-twitter-700 flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-5 h-5" /> ¡Comenzar a Usar Xbi!
      </button>
    </div>
  );

  const steps = [Step0_Profile, Step1_Interests, Step2_Suggested];
  const CurrentStep = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-twitter-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition ${
                idx <= currentStep ? 'bg-twitter-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Current Step */}
        <CurrentStep />

        {/* Skip Button */}
        <button
          onClick={completeOnboarding}
          className="text-center w-full text-gray-600 hover:text-gray-800 text-sm mt-6"
        >
          Saltar por ahora
        </button>
      </div>
    </div>
  );
}
