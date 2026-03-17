import { useState } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import './ChangePasswordPanel.css';
import { getToken } from '../../services/authService';

export default function ChangePasswordPanel({ currentUser, onToast }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [mostrarAtual, setMostrarAtual] = useState(false);
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const token = getToken();

  const limpar = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
  };

  // const handleSalvar = async () => {
  //   if (!senhaAtual || !novaSenha || !confirmarSenha) {
  //     onToast('Preencha todos os campos.');
  //     return;
  //   }
  //   if (novaSenha.length < 4) {
  //     onToast('A nova senha deve ter pelo menos 4 caracteres.');
  //     return;
  //   }
  //   if (novaSenha !== confirmarSenha) {
  //     onToast('As senhas não coincidem.');
  //     return;
  //   }

  //   setSalvando(true);
  //   try {
  //     const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${currentUser.id}`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     if (!res.ok) throw new Error('Erro ao buscar usuário.');
  //     const userData = await res.json();

  //     if (userData.password !== senhaAtual) {
  //       onToast('Senha atual incorreta.');
  //       return;
  //     }

  //     const patchRes = await fetch(`${import.meta.env.VITE_API_URL}/users/${currentUser.id}`, {
  //       method: 'PATCH',
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({ password: novaSenha }),
  //     });

  //     if (!patchRes.ok) throw new Error('Erro ao salvar senha.');

  //     setSucesso(true);
  //     limpar();
  //     onToast('Senha alterada com sucesso!');
  //     setTimeout(() => setSucesso(false), 3000);
  //   } catch (err) {
  //     onToast(err.message || 'Erro ao alterar senha.');
  //   } finally {
  //     setSalvando(false);
  //   }
  // };

  const handleSalvar = async () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      onToast('Preencha todos os campos.');
      return;
    }

    if (novaSenha.length < 4) {
      onToast('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      onToast('As senhas não coincidem.');
      return;
    }

    setSalvando(true);

    try {
      const patchRes = await fetch(`${import.meta.env.VITE_API_URL}/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: senhaAtual,
          newPassword: novaSenha,
        }),
      });

      const data = await patchRes.json().catch(() => null);

      if (!patchRes.ok) {
        throw new Error(data?.message || 'Erro ao alterar senha.');
      }

      setSucesso(true);
      limpar();
      onToast('Senha alterada com sucesso!');
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      onToast(err.message || 'Erro ao alterar senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="profile-card change-password">

      <div className="change-password__title">
        <FaLock className="change-password__title-icon" />
        Mudar Senha
      </div>

      {sucesso && (
        <div className="change-password__success">
          <FaCheck /> Senha alterada com sucesso!
        </div>
      )}

      <PasswordField
        label="Senha Atual"
        value={senhaAtual}
        onChange={setSenhaAtual}
        mostrar={mostrarAtual}
        onToggle={() => setMostrarAtual((v) => !v)}
        placeholder="Digite sua senha atual"
      />

      <PasswordField
        label="Nova Senha"
        value={novaSenha}
        onChange={setNovaSenha}
        mostrar={mostrarNova}
        onToggle={() => setMostrarNova((v) => !v)}
        placeholder="Mínimo 4 caracteres"
      />

      {novaSenha && <ForcaSenha senha={novaSenha} />}

      <PasswordField
        label="Confirmar Nova Senha"
        value={confirmarSenha}
        onChange={setConfirmarSenha}
        mostrar={mostrarConfirmar}
        onToggle={() => setMostrarConfirmar((v) => !v)}
        placeholder="Repita a nova senha"
        erro={confirmarSenha && novaSenha !== confirmarSenha ? 'As senhas não coincidem' : null}
      />

      <div className="change-password__actions">
        <button
          className="change-password__btn-save"
          onClick={handleSalvar}
          disabled={salvando}
        >
          {salvando
            ? <><span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> Salvando...</>
            : <><FaCheck /> Salvar Senha</>
          }
        </button>

        <button
          className="change-password__btn-clear"
          onClick={limpar}
          disabled={salvando}
        >
          <FaTimes /> Limpar
        </button>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, mostrar, onToggle, placeholder, erro }) {
  return (
    <div className="change-password__field">
      <label className="change-password__label">{label}</label>
      <div className="change-password__input-wrapper">
        <input
          type={mostrar ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`change-password__input${erro ? ' change-password__input--error' : ''}`}
        />
        <button type="button" className="change-password__toggle" onClick={onToggle}>
          {mostrar ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
      {erro && <span className="change-password__error-msg">{erro}</span>}
    </div>
  );
}

function ForcaSenha({ senha }) {
  const calcForca = () => {
    let score = 0;
    if (senha.length >= 4) score++;
    if (senha.length >= 8) score++;
    if (/[0-9]/.test(senha)) score++;
    if (/[A-Z]/.test(senha) || /[^A-Za-z0-9]/.test(senha)) score++;
    return score;
  };

  const barras = [
    { color: '#ef4444' },
    { color: '#f97316' },
    { color: '#eab308' },
    { color: '#22c55e' },
  ];
  const labels = ['Fraca', 'Razoável', 'Boa', 'Forte'];

  const score = Math.min(calcForca(), 4);
  const labelAtual = score === 0 ? 'Fraca' : labels[score - 1];
  const corAtual = score === 0 ? '#ef4444' : barras[score - 1].color;

  return (
    <div className="change-password__strength">
      <div className="change-password__strength-bars">
        {barras.map((b, i) => (
          <div
            key={i}
            className="change-password__strength-bar"
            style={{ background: i < score ? b.color : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <span className="change-password__strength-label" style={{ color: corAtual }}>
        {labelAtual}
      </span>
    </div>
  );
}