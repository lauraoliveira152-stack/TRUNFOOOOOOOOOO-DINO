// get geral já está alterada
// pool está configurado para portgresql de SJ

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'trunfo-dino',
    password: process.env.PGPASSWORD || 'senai',
    port: parseInt(process.env.PGPORT, 10) || 5433,
});

const TABLE = 'dino';

app.use(cors());
app.use(express.json());

app.get('/dinos', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${TABLE}`);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /dinos:', err);
        res.status(500).json({ error: 'Erro ao buscar dinos' });
    }
});

app.get('/dinos/random/:n', async (req, res) => {
    const quantidade = Number(req.params.n);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return res.status(400).json({ error: 'O parâmetro n deve ser um número inteiro positivo' });
    }

    try {
        const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY RANDOM() LIMIT $1`, [quantidade]);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /dinos/random/:n:', err);
        res.status(500).json({ error: 'Erro ao buscar dinos aleatórios' });
    }
});

app.get('/dinos/top/fama/:n', async (req, res) => {
    const quantidade = Number(req.params.n);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return res.status(400).json({ error: 'O parâmetro n deve ser um número inteiro positivo' });
    }

    try {
        const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY fama DESC LIMIT $1`, [quantidade]);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /dinos/top/fama/:n:', err);
        res.status(500).json({ error: 'Erro ao buscar os dinos mais famosos' });
    }
});

app.get('/dinos/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dino não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('GET /dinos/:id:', err);
        res.status(500).json({ error: 'Erro interno ao buscar dino' });
    }
});

app.post('/dinos', async (req, res) => {
    const { nome, altura, comprimento, peso, velocidade, agilidade, longevidade, numero_magico, imagem, fama, tipo } = req.body;

    if (!nome || !imagem) {
        return res.status(400).json({ error: 'Campos obrigatórios não enviados: nome e imagem' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO ${TABLE} (nome, altura, comprimento, peso, velocidade, agilidade, longevidade, numero_magico, imagem, fama, tipo)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [nome, altura, comprimento, peso, velocidade, agilidade, longevidade, numero_magico, imagem, fama, tipo]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /dinos:', err);
        res.status(500).json({ error: 'Erro ao adicionar dino' });
    }
});

app.put('/dinos/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { nome, altura, comprimento, peso, velocidade, agilidade, longevidade, numero_magico, imagem, fama, tipo } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        const result = await pool.query(
            `UPDATE ${TABLE}
             SET nome = $1, altura = $2, comprimento = $3, peso = $4, velocidade = $5, agilidade = $6,
                 longevidade = $7, numero_magico = $8, imagem = $9, fama = $10, tipo = $11
             WHERE id = $12 RETURNING *`,
            [nome, altura, comprimento, peso, velocidade, agilidade, longevidade, numero_magico, imagem, fama, tipo, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dino não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('PUT /dinos/:id:', err);
        res.status(500).json({ error: 'Erro ao atualizar dino' });
    }
});

app.delete('/dinos/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        const result = await pool.query(`DELETE FROM ${TABLE} WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dino não encontrado' });
        }
        res.json({ message: 'Dino deletado com sucesso' });
    } catch (err) {
        console.error('DELETE /dinos/:id:', err);
        res.status(500).json({ error: 'Erro ao deletar dino' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});