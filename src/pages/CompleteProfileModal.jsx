import { useState } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import { saveSession } from '../services/authService';
import './CompleteProfileModal.css';

export default function CompleteProfileModal({ user, onComplete }) {
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [barbershop, setBarbershop] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidCPF = (cpf) => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
    let d = 11 - (sum % 11);
    if (d === 10 || d === 11) d = 0;
    if (d !== parseInt(clean[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
    d = 11 - (sum % 11);
    if (d === 10 || d === 11) d = 0;
    return d === parseInt(clean[10]);
  };

  const formatCPF = (value) => {
    const c = value.replace(/\D/g, '');
    if (c.length <= 3) return c;
    if (c.length <= 6) return `${c.slice(0, 3)}.${c.slice(3)}`;
    if (c.length <= 9) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6)}`;
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9, 11)}`;
  };

  const formatPhone = (value) => {
    const c = value.replace(/\D/g, '');
    if (c.length <= 2) return c;
    if (c.length <= 7) return `(${c.slice(0, 2)}) ${c.slice(2)}`;
    return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7, 11)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCPF = cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cpf || !phone || !birthDate || !barbershop) {
      setError('Preencha todos os campos.');
      return;
    }
    if (!isValidCPF(cleanCPF)) {
      setError('CPF inválido. Verifique os dígitos.');
      return;
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setError('Telefone inválido. Use o formato (85) 99999-9999');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = {
        ...user,
        cpf: cleanCPF,
        phone: cleanPhone,
        birthDate,
        barbershops: [barbershop.trim()],
        profileComplete: true,
      };

      await api.put(`/users/${user.id}`, updatedUser);
      saveSession(updatedUser);
      onComplete(updatedUser);
    } catch (err) {
      setError('Erro ao salvar dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cpm-overlay">
      <div className="cpm-modal">
        <div className="cpm-header">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="cpm-avatar" />
          )}
          <h2 className="cpm-title">Quase lá, {user.name?.split(' ')[0]}!</h2>
          <p className="cpm-subtitle">
            Complete seu perfil para continuar usando o sistema.
          </p>
        </div>

        {error && <p className="cpm-error">{error}</p>}

        <form className="cpm-form" onSubmit={handleSubmit}>
          <Input
            label="CPF"
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            maxLength="14"
          />
          <Input
            label="Telefone/WhatsApp"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(85) 99999-9999"
            maxLength="15"
          />
          <Input
            label="Data de Nascimento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          <Input
            label="Nome da Barbearia"
            type="text"
            value={barbershop}
            onChange={(e) => setBarbershop(e.target.value)}
            placeholder="Ex: Barbearia Rodrigues"
          />

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar e continuar'}
          </Button>
        </form>
      </div>
    </div>
  );
}